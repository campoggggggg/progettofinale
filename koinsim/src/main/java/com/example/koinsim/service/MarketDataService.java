package com.example.koinsim.service;

import com.example.koinsim.dto.MarketDataResponse;
import com.example.koinsim.dto.SimboloDisponibileResponse;
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
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    private static final String FONTE_ALPHA     = "ALPHA_VANTAGE";
    private static final String FONTE_COINGECKO = "COINGECKO";
    private static final String FONTE_STOOQ     = "STOOQ";
    private static final String FETCH_PREFIX    = "mkt:fetched:";
    private static final String PARAMS_PREFIX   = "mkt:params:";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    private static final int STOOQ_STALE_DAYS = 100;

    // Mapping CoinGecko ID → simbolo Stooq per le crypto più comuni
    private static final Map<String, String> CRYPTO_STOOQ = Map.ofEntries(
            Map.entry("bitcoin",        "BTC.V"),
            Map.entry("ethereum",       "ETH.V"),
            Map.entry("dogecoin",       "DOGE.V"),
            Map.entry("litecoin",       "LTC.V"),
            Map.entry("solana",         "SOL.V"),
            Map.entry("ripple",         "XRP.V"),
            Map.entry("cardano",        "ADA.V"),
            Map.entry("polkadot",       "DOT.V"),
            Map.entry("chainlink",      "LINK.V"),
            Map.entry("avalanche-2",    "AVAX.V"),
            Map.entry("matic-network",  "MATIC.V"),
            Map.entry("uniswap",        "UNI.V"),
            Map.entry("shiba-inu",      "SHIB.V")
    );

    private final PrezzoStoricoRepository repository;
    private final WebClient webClient;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Value("${alpha.vantage.api.key}")
    private String alphaVantageKey;

    @Value("${coingecko.api.key}")
    private String coinGeckoKey;

    @Value("${stooq.api.key:}")
    private String stooqKey;

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

    public List<SimboloDisponibileResponse> getSimboliDisponibili() {
        return repository.findDistinctSimboliConFonte().stream()
                .map(row -> {
                    String simbolo = (String) row[0];
                    String fonte   = (String) row[1];
                    TipoAsset tipo = FONTE_COINGECKO.equals(fonte) ? TipoAsset.CRYPTO : TipoAsset.STOCK;
                    return new SimboloDisponibileResponse(simbolo, tipo);
                })
                .collect(Collectors.toList());
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public MarketDataResponse fetchAndPersistAll(String symbol, TipoAsset type, String stooqSymbol) {
        String sym       = normalizeSymbol(symbol, type);
        // Se stooqSymbol non è fornito, lo deriva automaticamente dal simbolo principale
        String stooqSym  = (stooqSymbol != null && !stooqSymbol.isBlank())
                ? stooqSymbol
                : deriveStooqSymbol(sym, type);
        String fetchKey  = FETCH_PREFIX + sym + ":" + type;
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

        // --- Step 1: Stooq bulk storico (se derivabile e dati scaduti o assenti) ---
        if (stooqSym != null) {
            try {
                LocalDate ultimaStooq = repository.findLastDate(sym, FONTE_STOOQ).orElse(null);
                boolean scaduto = ultimaStooq == null ||
                        ChronoUnit.DAYS.between(ultimaStooq, LocalDate.now()) > STOOQ_STALE_DAYS;
                if (scaduto) {
                    log.info("Fetch Stooq per {} → {} (ultimaData={})", sym, stooqSym, ultimaStooq);
                    List<PrezzoStorico> stooqData = fetchStooq(stooqSym, sym);
                    persistiConFonte(sym, stooqData, FONTE_STOOQ, type);
                } else {
                    log.info("Stooq già aggiornato per {} (ultimaData={}), skip", sym, ultimaStooq);
                }
            } catch (Exception e) {
                log.warn("Fetch Stooq fallito per {} (continuo con fonte primaria): {}", sym, e.getMessage());
            }
        }

        // --- Step 2: fonte primaria per le date più recenti (solo quelle mancanti) ---
        List<PrezzoStorico> recenti = switch (type) {
            case STOCK  -> fetchAlphaVantage(sym);
            case CRYPTO -> fetchCoinGecko(sym);
            case STOOQ  -> List.of();
        };

        if (!recenti.isEmpty()) {
            Set<LocalDate> tutteLeDate = repository.findAllExistingDates(sym);
            List<PrezzoStorico> nuoviRecenti = recenti.stream()
                    .filter(p -> !tutteLeDate.contains(p.getData()))
                    .collect(Collectors.toList());
            if (!nuoviRecenti.isEmpty()) {
                persistiConFonte(sym, nuoviRecenti, fonteFor(type), type);
            }
        }

        // --- Step 3: statistiche su tutti i dati combinati, deduplicati per data ---
        List<PrezzoStorico> tuttiDati = repository.findBySimboloOrderByDataAsc(sym);
        List<PrezzoStorico> datiUnici = deduplicaPerData(tuttiDati);

        if (datiUnici.isEmpty()) {
            throw new SymbolNotFoundException("Nessun dato disponibile per: " + sym);
        }

        MarketDataResponse response = calcolaStatistiche(sym, type, datiUnici);
        cacheRisultato(fetchKey, paramsKey, response);
        return response;
    }

    // -------------------------------------------------------------------------
    // Fetchers
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private List<PrezzoStorico> fetchAlphaVantage(String symbol) {
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

    // urlSymbol = simbolo usato nell'URL Stooq (es. "aapl.us", "doge.v")
    // dbSymbol  = simbolo con cui salvare i record in DB (es. "AAPL", "dogecoin")
    private List<PrezzoStorico> fetchStooq(String urlSymbol, String dbSymbol) {
        String d1  = LocalDate.now().minusYears(10).format(DateTimeFormatter.BASIC_ISO_DATE);
        String d2  = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String url = "https://stooq.com/q/d/l/?s=" + urlSymbol.toLowerCase()
                + "&d1=" + d1 + "&d2=" + d2 + "&i=d"
                + (stooqKey != null && !stooqKey.isBlank() ? "&apikey=" + stooqKey : "");

        String csv = webClient.get()
                .uri(url)
                .header("User-Agent",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
                .retrieve()
                .onStatus(s -> s.isError(), resp -> resp.bodyToMono(String.class)
                        .map(b -> new RuntimeException("Stooq " + resp.statusCode() + ": " + b)))
                .bodyToMono(String.class)
                .block();

        if (csv == null || csv.isBlank()) {
            throw new SymbolNotFoundException("Stooq non ha restituito dati per: " + urlSymbol);
        }

        if (csv.trim().startsWith("<")) {
            log.error("Stooq ha restituito HTML per {}: {}",
                    urlSymbol, csv.substring(0, Math.min(200, csv.length())));
            throw new SymbolNotFoundException("Stooq non ha restituito un CSV valido per: " + urlSymbol);
        }

        String[] lines = csv.split("\r?\n");
        if (lines.length < 2) {
            throw new SymbolNotFoundException("CSV Stooq vuoto per: " + urlSymbol);
        }

        log.info("Stooq CSV per {}: {} righe di dati", urlSymbol, lines.length - 1);

        List<PrezzoStorico> result = new ArrayList<>();
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            // formato: Date,Open,High,Low,Close,Volume
            String[] cols = line.split(",");
            if (cols.length < 5) {
                log.warn("Riga Stooq con colonne insufficienti (ignorata): {}", line);
                continue;
            }
            try {
                LocalDate data  = LocalDate.parse(cols[0].trim());
                Double    open  = parseStooqDouble(cols[1]);
                Double    high  = parseStooqDouble(cols[2]);
                Double    low   = parseStooqDouble(cols[3]);
                Double    close = parseStooqDouble(cols[4]);
                if (close == null) continue;
                result.add(PrezzoStorico.builder()
                        .simbolo(dbSymbol)
                        .data(data)
                        .open(open)
                        .high(high)
                        .low(low)
                        .close(close)
                        .fonte(FONTE_STOOQ)
                        .build());
            } catch (Exception e) {
                log.warn("Riga Stooq non parsabile (ignorata): {} — {}", line, e.getMessage());
            }
        }

        if (result.isEmpty()) {
            throw new SymbolNotFoundException("Nessun dato valido nel CSV Stooq per: " + urlSymbol);
        }
        return result;
    }

    private Double parseStooqDouble(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty() || t.equalsIgnoreCase("null")) return null;
        return Double.parseDouble(t);
    }

    // -------------------------------------------------------------------------
    // Persistenza
    // -------------------------------------------------------------------------

    private void persistiConFonte(String symbol, List<PrezzoStorico> nuovi,
                                   String fonte, TipoAsset type) {
        Set<LocalDate> esistenti = repository.findExistingDates(symbol, fonte);
        List<PrezzoStorico> daSalvare = nuovi.stream()
                .filter(p -> !esistenti.contains(p.getData()))
                .toList();

        if (!daSalvare.isEmpty()) {
            try {
                repository.saveAll(daSalvare);
            } catch (DataIntegrityViolationException e) {
                log.warn("Dati già presenti per {} fonte {} (constraint violation ignorata)", symbol, fonte);
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
    // Helpers
    // -------------------------------------------------------------------------

    private List<PrezzoStorico> deduplicaPerData(List<PrezzoStorico> dati) {
        // Dati già ordinati per data ASC; teniamo il primo record per ogni data
        // (Stooq arriva prima → ha precedenza per le date storiche)
        Map<LocalDate, PrezzoStorico> byDate = new LinkedHashMap<>();
        for (PrezzoStorico p : dati) {
            byDate.putIfAbsent(p.getData(), p);
        }
        return new ArrayList<>(byDate.values());
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

        double[] logReturns = new double[dati.size() - 1];
        for (int i = 1; i < dati.size(); i++) {
            logReturns[i - 1] = Math.log(dati.get(i).getClose() / dati.get(i - 1).getClose());
        }

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

    private String normalizeSymbol(String symbol, TipoAsset type) {
        return type == TipoAsset.CRYPTO ? symbol.toLowerCase() : symbol.toUpperCase();
    }

    // Deriva il simbolo Stooq automaticamente: STOCK → "SYMBOL.US", CRYPTO → mappa predefinita
    private String deriveStooqSymbol(String sym, TipoAsset type) {
        return switch (type) {
            case STOCK  -> sym.toUpperCase() + ".US";
            case CRYPTO -> CRYPTO_STOOQ.get(sym.toLowerCase());
            case STOOQ  -> null;
        };
    }

    private String fonteFor(TipoAsset type) {
        return switch (type) {
            case STOCK  -> FONTE_ALPHA;
            case CRYPTO -> FONTE_COINGECKO;
            case STOOQ  -> FONTE_STOOQ;
        };
    }

    private String fmtDouble(Double value) {
        return value != null ? String.format("%.6f", value) : "";
    }
}
