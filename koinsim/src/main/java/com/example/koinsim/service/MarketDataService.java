package com.example.koinsim.service;

import com.example.koinsim.dto.MarketDataResponse;
import com.example.koinsim.exception.ApiLimitException;
import com.example.koinsim.exception.DataPersistenceException;
import com.example.koinsim.exception.SymbolNotFoundException;
import com.example.koinsim.model.PrezzoStorico;
import com.example.koinsim.model.TipoAsset;
import com.example.koinsim.repository.PrezzoStoricoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.math3.stat.descriptive.DescriptiveStatistics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    private static final String FONTE_ALPHA     = "ALPHA_VANTAGE";
    private static final String FONTE_COINGECKO = "COINGECKO";
    private static final String FETCH_PREFIX    = "mkt:fetched:";
    private static final String PARAMS_PREFIX   = "mkt:params:";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final PrezzoStoricoRepository repository;
    private final WebClient webClient;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Value("${alpha.vantage.api.key}")
    private String alphaVantageKey;

    @Value("${coingecko.api.key}")
    private String coinGeckoKey;

    @Value("${market.data.csv.path:./data}")
    private String csvBasePath;

    @Value("${market.data.redis.ttl-hours:24}")
    private long redisTtlHours;

    public MarketDataService(PrezzoStoricoRepository repository,
                             WebClient webClient,
                             StringRedisTemplate redis,
                             ObjectMapper objectMapper) {
        this.repository   = repository;
        this.webClient    = webClient;
        this.redis        = redis;
        this.objectMapper = objectMapper;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Singola chiamata per fonte: recupera tutti i dati storici disponibili,
     * li persiste su MySQL + CSV, li indicizza su Redis, e restituisce mu/sigma
     * pronti per la simulazione Monte Carlo.
     * Se i dati sono già stati recuperati nelle ultime {@code redisTtlHours} ore,
     * restituisce direttamente il risultato dalla cache senza toccare le API esterne.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public MarketDataResponse fetchAndPersistAll(String symbol, TipoAsset type) {
        String sym      = normalizeSymbol(symbol, type);
        String fetchKey = FETCH_PREFIX + sym + ":" + type;
        String paramsKey = PARAMS_PREFIX + sym + ":" + type;

        // --- cache hit: zero API calls ---
        if (Boolean.TRUE.equals(redis.hasKey(fetchKey))) {
            String cached = redis.opsForValue().get(paramsKey);
            if (cached != null) {
                try {
                    MarketDataResponse r = objectMapper.readValue(cached, MarketDataResponse.class);
                    r.setFromCache(true);
                    return r;
                } catch (Exception e) {
                    log.warn("Cache corrotta per {}, ri-fetching: {}", sym, e.getMessage());
                }
            }
        }

        // --- singola chiamata API per fonte ---
        List<PrezzoStorico> nuovi = switch (type) {
            case STOCK  -> fetchAlphaVantage(sym);
            case CRYPTO -> fetchCoinGecko(sym);
        };

        if (nuovi.isEmpty()) {
            throw new SymbolNotFoundException("Nessun dato restituito per: " + sym);
        }

        // --- persistenza: MySQL + CSV ---
        persisti(sym, type, nuovi);

        // --- calcolo statistiche su tutti i record in DB (accumulo storico) ---
        List<PrezzoStorico> tuttiDati =
                repository.findBySimboloAndFonteOrderByDataAsc(sym, fonteFor(type));

        MarketDataResponse response = calcolaStatistiche(sym, type, tuttiDati);

        // --- cache risultato per le prossime 24h ---
        cacheRisultato(fetchKey, paramsKey, response);

        return response;
    }

    // -------------------------------------------------------------------------
    // Fetchers (una sola chiamata HTTP per fonte)
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private List<PrezzoStorico> fetchAlphaVantage(String symbol) {
        // compact = ultimi ~100 giorni di borsa; outputsize=full per 20 anni (a pagamento)
        String url = "https://www.alphavantage.co/query"
                + "?function=TIME_SERIES_DAILY"
                + "&symbol=" + symbol
                + "&outputsize=compact"
                + "&apikey=" + alphaVantageKey;

        Map<String, Object> body = webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (body == null) {
            throw new SymbolNotFoundException("Alpha Vantage non ha restituito dati per: " + symbol);
        }

        // Rilevamento rate-limit: AV risponde con campo "Note" o "Information"
        if (body.containsKey("Note") || body.containsKey("Information")) {
            String msg = (String) body.getOrDefault("Note", body.get("Information"));
            throw new ApiLimitException("Limite giornaliero Alpha Vantage raggiunto: " + msg);
        }

        Map<String, Object> series = (Map<String, Object>) body.get("Time Series (Daily)");
        if (series == null || series.isEmpty()) {
            throw new SymbolNotFoundException("Simbolo non trovato su Alpha Vantage: " + symbol);
        }

        return series.entrySet().stream()
                .map(e -> {
                    LocalDate data        = LocalDate.parse(e.getKey());
                    Map<String, String> v = (Map<String, String>) e.getValue();
                    return PrezzoStorico.builder()
                            .simbolo(symbol)
                            .data(data)
                            .open(Double.parseDouble(v.get("1. open")))
                            .high(Double.parseDouble(v.get("2. high")))
                            .low(Double.parseDouble(v.get("3. low")))
                            .close(Double.parseDouble(v.get("4. close")))
                            .fonte(FONTE_ALPHA)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private List<PrezzoStorico> fetchCoinGecko(String symbol) {
        // OHLC endpoint: 365 giorni → granularità giornaliera
        // risposta: [[timestamp_ms, open, high, low, close], ...]
        String url = "https://api.coingecko.com/api/v3/coins/" + symbol
                + "/ohlc?vs_currency=usd&days=365";

        List<List<Object>> raw = webClient.get()
                .uri(url)
                .header("x-cg-demo-api-key", coinGeckoKey)
                .retrieve()
                .onStatus(s -> s.value() == 429, resp -> resp.bodyToMono(String.class)
                        .map(b -> new ApiLimitException("Limite giornaliero CoinGecko raggiunto.")))
                .onStatus(s -> s.value() == 404, resp -> resp.bodyToMono(String.class)
                        .map(b -> new SymbolNotFoundException(
                                "Simbolo non trovato su CoinGecko: " + symbol)))
                .onStatus(s -> s.isError(), resp -> resp.bodyToMono(String.class)
                        .map(b -> new RuntimeException(
                                "CoinGecko " + resp.statusCode() + ": " + b)))
                .bodyToMono(List.class)
                .block();

        if (raw == null || raw.isEmpty()) {
            throw new SymbolNotFoundException("Nessun dato OHLC CoinGecko per: " + symbol);
        }

        // Deduplica per data (range brevi producono candele 4h → più candele/giorno)
        Map<LocalDate, PrezzoStorico> byDate = new LinkedHashMap<>();
        for (List<Object> candle : raw) {
            long tsMs      = ((Number) candle.get(0)).longValue();
            LocalDate data = Instant.ofEpochMilli(tsMs).atZone(ZoneOffset.UTC).toLocalDate();
            byDate.put(data, PrezzoStorico.builder()
                    .simbolo(symbol)
                    .data(data)
                    .open(((Number) candle.get(1)).doubleValue())
                    .high(((Number) candle.get(2)).doubleValue())
                    .low(((Number) candle.get(3)).doubleValue())
                    .close(((Number) candle.get(4)).doubleValue())
                    .fonte(FONTE_COINGECKO)
                    .build());
        }
        return new ArrayList<>(byDate.values());
    }

    // -------------------------------------------------------------------------
    // Persistenza
    // -------------------------------------------------------------------------

    private void persisti(String symbol, TipoAsset type, List<PrezzoStorico> nuovi) {
        String fonte = fonteFor(type);

        // Legge le date già presenti in DB per evitare violazioni del vincolo univoco
        Set<LocalDate> esistenti = repository.findExistingDates(symbol, fonte);

        List<PrezzoStorico> daSalvare = nuovi.stream()
                .filter(p -> !esistenti.contains(p.getData()))
                .toList();

        if (!daSalvare.isEmpty()) {
            try {
                repository.saveAll(daSalvare);
            } catch (DataIntegrityViolationException e) {
                log.warn("Dati già presenti per {} (constraint violation ignorata)", symbol);
            } catch (Exception e) {
                log.warn("Salvataggio fallito per {}: {} — continuo con i dati già in DB", symbol, e.getMessage());
            }
        }
        try {
            appendCSV(symbol, type, daSalvare);
        } catch (Exception e) {
            log.warn("Scrittura CSV fallita per {} (non bloccante): {}", symbol, e.getMessage());
        }
    }

    private void appendCSV(String symbol, TipoAsset type, List<PrezzoStorico> prezzi) {
        if (prezzi.isEmpty()) return;

        Path filePath = Paths.get(csvBasePath, symbol.toUpperCase() + "_" + type + ".csv");

        try {
            Files.createDirectories(filePath.getParent());
            boolean fileEsisteva = Files.exists(filePath);

            try (PrintWriter writer = new PrintWriter(new FileWriter(filePath.toFile(), true))) {
                if (!fileEsisteva) {
                    writer.println("symbol,date,open,high,low,close,source");
                }
                prezzi.stream()
                        .sorted(Comparator.comparing(PrezzoStorico::getData))
                        .forEach(p -> writer.printf("%s,%s,%s,%s,%s,%.6f,%s%n",
                                p.getSimbolo(),
                                p.getData().format(DATE_FMT),
                                fmtDouble(p.getOpen()),
                                fmtDouble(p.getHigh()),
                                fmtDouble(p.getLow()),
                                p.getClose(),
                                p.getFonte()));
            }
        } catch (IOException e) {
            throw new DataPersistenceException("Errore scrittura CSV per " + symbol, e);
        }
    }

    // -------------------------------------------------------------------------
    // Statistiche: mu e sigma per Monte Carlo
    // -------------------------------------------------------------------------

    private MarketDataResponse calcolaStatistiche(String symbol, TipoAsset type,
                                                   List<PrezzoStorico> dati) {
        if (dati.size() < 2) {
            throw new IllegalStateException(
                    "Dati insufficienti per calcolare mu/sigma (min 2 prezzi): " + symbol);
        }

        // Log-return giornaliero: r_t = ln(P_t / P_{t-1})
        double[] logReturns = new double[dati.size() - 1];
        for (int i = 1; i < dati.size(); i++) {
            logReturns[i - 1] = Math.log(dati.get(i).getClose() / dati.get(i - 1).getClose());
        }

        // DescriptiveStatistics usa deviazione standard campionaria (denominatore N-1)
        DescriptiveStatistics stats = new DescriptiveStatistics(logReturns);

        return MarketDataResponse.builder()
                .symbol(symbol)
                .type(type)
                .mu(stats.getMean())
                .sigma(stats.getStandardDeviation())
                .dataPoints(dati.size())
                .fromDate(dati.get(0).getData())
                .toDate(dati.get(dati.size() - 1).getData())
                .fromCache(false)
                .build();
    }

    // -------------------------------------------------------------------------
    // Redis
    // -------------------------------------------------------------------------

    private void cacheRisultato(String fetchKey, String paramsKey, MarketDataResponse response) {
        try {
            String json = objectMapper.writeValueAsString(response);
            Duration ttl = Duration.ofHours(redisTtlHours);
            redis.opsForValue().set(fetchKey, "1", ttl);
            redis.opsForValue().set(paramsKey, json, ttl);
        } catch (Exception e) {
            log.warn("Impossibile memorizzare il risultato in Redis: {}", e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private String normalizeSymbol(String symbol, TipoAsset type) {
        return type == TipoAsset.STOCK ? symbol.toUpperCase() : symbol.toLowerCase();
    }

    private String fonteFor(TipoAsset type) {
        return type == TipoAsset.STOCK ? FONTE_ALPHA : FONTE_COINGECKO;
    }

    private String fmtDouble(Double value) {
        return value != null ? String.format("%.6f", value) : "";
    }
}
