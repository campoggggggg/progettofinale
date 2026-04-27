package com.example.koinsim.service;

import com.example.koinsim.model.PrezzoStorico;
import com.example.koinsim.repository.PrezzoStoricoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Service per il recupero dei prezzi degli asset finanziari (crypto e azioni).
 * Interroga CoinGecko per le criptovalute e Alpha Vantage per le azioni.
 * In caso di errore API, ricade sull'ultimo prezzo disponibile nel database.
 */
@Service
public class PrezzoService {

    private static final Logger log = LoggerFactory.getLogger(PrezzoService.class);

    private final WebClient webClient;
    private final PrezzoStoricoRepository prezzoStoricoRepository;

    @Value("${alpha.vantage.api.key}")
    private String apiKey;

    @Value("${coingecko.api.key}")
    private String coingeckoApiKey;

    public PrezzoService(WebClient webClient, PrezzoStoricoRepository prezzoStoricoRepository) {
        this.webClient = webClient;
        this.prezzoStoricoRepository = prezzoStoricoRepository;
    }

    /**
     * Restituisce il prezzo corrente dell'asset, delegando al metodo specifico
     * in base al tipo ("CRYPTO" o "STOCK").
     */
    public Double getPrezzo(String simbolo, String tipoAsset) {
        return switch (tipoAsset.toUpperCase()) {
            case "CRYPTO" -> getPrezzoSimbolo(simbolo);
            case "STOCK" -> getPrezzoAzione(simbolo);
            default -> throw new IllegalArgumentException("Tipo asset non supportato: " + tipoAsset);
        };
    }

    /**
     * Recupera il prezzo corrente di una criptovaluta tramite l'API CoinGecko.
     * Il risultato è cachato per simbolo per evitare chiamate ripetute.
     * Fallback: restituisce l'ultimo prezzo storico presente nel DB.
     */
    @Cacheable(value = "prezziCrypto", key = "#simbolo")
    public Double getPrezzoSimbolo(String simbolo) {
        String url = "https://api.coingecko.com/api/v3/simple/price"
                + "?ids=" + simbolo + "&vs_currencies=usd";

        try {
            return webClient.get().uri(url)
                    .header("x-cg-demo-api-key", coingeckoApiKey)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .map(corpo -> {
                        Map<String, Object> voce = (Map<String, Object>) corpo.get(simbolo);
                        if (voce == null || voce.get("usd") == null) {
                            throw new RuntimeException("Prezzo non disponibile per: " + simbolo);
                        }
                        return ((Number) voce.get("usd")).doubleValue();
                    }).block();
        } catch (RuntimeException e) {
            log.warn("CoinGecko non disponibile per {}, uso ultimo prezzo dal DB: {}", simbolo, e.getMessage());
            List<PrezzoStorico> storici = prezzoStoricoRepository
                    .findBySimboloOrderByDataAsc(simbolo.toUpperCase());
            if (!storici.isEmpty()) {
                return storici.get(storici.size() - 1).getClose();
            }
            throw new RuntimeException("Prezzo non disponibile per " + simbolo + " e nessun dato storico in DB.");
        }
    }

    /**
     * Recupera il prezzo corrente di un'azione tramite Alpha Vantage (GLOBAL_QUOTE).
     * Il risultato è cachato per simbolo per evitare chiamate ripetute.
     * Gestisce esplicitamente il rate limit di Alpha Vantage (chiavi "Information"/"Note").
     * Fallback: restituisce l'ultimo prezzo storico presente nel DB.
     */
    @Cacheable(value = "prezziStock", key = "#simbolo")
    public Double getPrezzoAzione(String simbolo) {
        String url = "https://www.alphavantage.co/query"
                + "?function=GLOBAL_QUOTE&symbol=" + simbolo
                + "&apikey=" + apiKey;

        try {
            return webClient.get().uri(url).retrieve()
                    .bodyToMono(Map.class)
                    .map(corpo -> {
                        if (corpo.containsKey("Information") || corpo.containsKey("Note")) {
                            throw new RuntimeException("rate_limit");
                        }
                        Map<String, String> quotazione = (Map<String, String>) corpo.get("Global Quote");
                        if (quotazione == null || quotazione.get("05. price") == null || quotazione.get("05. price").isBlank()) {
                            throw new RuntimeException("Prezzo non disponibile per il simbolo: " + simbolo);
                        }
                        return Double.parseDouble(quotazione.get("05. price"));
                    }).block();
        } catch (RuntimeException e) {
            log.warn("Alpha Vantage non disponibile per {}, uso ultimo prezzo dal DB: {}", simbolo, e.getMessage());
            List<PrezzoStorico> storici = prezzoStoricoRepository
                    .findBySimboloOrderByDataAsc(simbolo.toUpperCase());
            if (!storici.isEmpty()) {
                return storici.get(storici.size() - 1).getClose();
            }
            throw new RuntimeException("Prezzo non disponibile per " + simbolo + " e nessun dato storico in DB.");
        }
    }

    /**
     * Restituisce il prezzo dell'asset in una data specifica,
     * delegando al metodo specifico in base al tipo ("CRYPTO" o "STOCK").
     */
    public Double getPrezzoStorico(String simbolo, String tipoAsset, LocalDate data) {
        return switch (tipoAsset.toUpperCase()) {
            case "CRYPTO" -> getPrezzoStoricoCrypto(simbolo, data);
            case "STOCK" -> getPrezzoStoricoStock(simbolo, data);
            default -> throw new IllegalArgumentException("Tipo asset non supportato: " + tipoAsset);
        };
    }

    /**
     * Recupera il prezzo storico di una crypto per una data specifica via CoinGecko
     * (endpoint market_chart/range con finestra [data, data+1g in UTC).
     * Restituisce il primo prezzo disponibile nell'intervallo.
     */
    public Double getPrezzoStoricoCrypto(String simbolo, LocalDate data) {
        long from = data.atStartOfDay(ZoneOffset.UTC).toEpochSecond();
        long to   = data.plusDays(1).atStartOfDay(ZoneOffset.UTC).toEpochSecond();
        String url = "https://api.coingecko.com/api/v3/coins/" + simbolo
                + "/market_chart/range?vs_currency=usd&from=" + from + "&to=" + to;

        return webClient.get().uri(url)
                .header("x-cg-demo-api-key", coingeckoApiKey)
                .retrieve()
                .onStatus(status -> status.isError(), response ->
                        response.bodyToMono(String.class)
                                .map(body -> new RuntimeException(
                                        "CoinGecko " + response.statusCode() + ": " + body)))
                .bodyToMono(Map.class)
                .map(corpo -> {
                    List<List<Number>> prices = (List<List<Number>>) corpo.get("prices");
                    if (prices == null || prices.isEmpty()) {
                        throw new RuntimeException("Nessun dato storico CoinGecko per: " + simbolo + " " + data);
                    }
                    return prices.get(0).get(1).doubleValue();
                }).block();
    }

    /**
     * Recupera il prezzo storico di un'azione per una data specifica via Alpha Vantage
     * (TIME_SERIES_DAILY). Il prezzo restituito è la media tra high e low del giorno.
     */
    public Double getPrezzoStoricoStock(String simbolo, LocalDate data) {
        String dataFormattata = data.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String url = "https://www.alphavantage.co/query"
                + "?function=TIME_SERIES_DAILY&symbol=" + simbolo
                + "&apikey=" + apiKey;

        return webClient.get().uri(url).retrieve()
                .bodyToMono(Map.class)
                .map(corpo -> {
                    Map<String, Object> serie = (Map<String, Object>) corpo.get("Time Series (Daily)");
                    if (serie == null) {
                        throw new RuntimeException("Alpha Vantage non ha restituito dati. Risposta: " + corpo);
                    }
                    Map<String, String> giorno = (Map<String, String>) serie.get(dataFormattata);
                    if (giorno == null) {
                        throw new RuntimeException("Nessun dato disponibile per la data: " + dataFormattata);
                    }
                    double high = Double.parseDouble(giorno.get("2. high"));
                    double low  = Double.parseDouble(giorno.get("3. low"));
                    return (high + low) / 2.0;
                }).block();
    }

}
