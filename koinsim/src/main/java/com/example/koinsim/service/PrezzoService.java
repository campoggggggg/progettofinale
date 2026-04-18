package com.example.koinsim.service;

import com.example.koinsim.model.Transazione;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class PrezzoService {

    private final WebClient webClient;

    @Value("${alpha.vantage.api.key}")
    private String apiKey;

    @Value("${coingecko.api.key}")
    private String coingeckoApiKey;

    public PrezzoService(WebClient webClient) {
        this.webClient = webClient;
    }

    public Double getPrezzo(String simbolo, String tipoAsset) {
        return switch (tipoAsset.toUpperCase()) {
            case "CRYPTO" -> getPrezzoSimbolo(simbolo);
            case "STOCK" -> getPrezzoAzione(simbolo);
            default -> throw new IllegalArgumentException("Tipo asset non supportato: " + tipoAsset);
        };
    }

    @Cacheable(value = "prezziCrypto", key = "#simbolo")
    public Double getPrezzoSimbolo(String simbolo) {
        String url = "https://api.coingecko.com/api/v3/simple/price"
                + "?ids=" + simbolo + "&vs_currencies=usd";

        return webClient.get().uri(url)
                .header("x-cg-demo-api-key", coingeckoApiKey)
                .retrieve()
                .bodyToMono(Map.class)
                .map(corpo -> {
                    Map<String, Object> voce = (Map<String, Object>) corpo.get(simbolo);
                    return ((Number) voce.get("usd")).doubleValue();
                }).block();
    }

    @Cacheable(value = "prezziAzioni", key = "#simbolo")
    public Double getPrezzoAzione(String simbolo) {
        String url = "https://www.alphavantage.co/query"
                + "?function=GLOBAL_QUOTE&symbol=" + simbolo
                + "&apikey=" + apiKey;

        return webClient.get().uri(url).retrieve()
                .bodyToMono(Map.class)
                .map(corpo -> {
                    Map<String, String> quotazione = (Map<String, String>) corpo.get("Global Quote");
                    return Double.parseDouble(quotazione.get("05. price"));
                }).block();
    }

    // ── Prezzo STORICO (usato da PortfolioService.aggiungi) ──────────

    public Double getPrezzoStorico(String simbolo, String tipoAsset, LocalDate data) {
        return switch (tipoAsset.toUpperCase()) {
            case "CRYPTO" -> getPrezzoStoricoCrypto(simbolo, data);
            case "STOCK" -> getPrezzoStoricoAzione(simbolo, data);
            default -> throw new IllegalArgumentException("Tipo asset non supportato: " + tipoAsset);
        };
    }

    // CoinGecko: endpoint /coins/{id}/history?date=dd-MM-yyyy
    public Double getPrezzoStoricoCrypto(String simbolo, LocalDate data) {
        String dataFormattata = data.format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        String url = "https://api.coingecko.com/api/v3/coins/" + simbolo
                + "/history?date=" + dataFormattata + "&localization=false";

        return webClient.get().uri(url)
                .header("x-cg-demo-api-key", coingeckoApiKey)
                .retrieve()
                .bodyToMono(Map.class)
                .map(corpo -> {
                    Map<String, Object> marketData = (Map<String, Object>) corpo.get("market_data");
                    Map<String, Object> currentPrice = (Map<String, Object>) marketData.get("current_price");
                    return ((Number) currentPrice.get("usd")).doubleValue();
                }).block();
    }

    // Alpha Vantage: TIME_SERIES_DAILY → estrae il giorno → (high + low) / 2
    public Double getPrezzoStoricoAzione(String simbolo, LocalDate data) {
        String dataFormattata = data.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String url = "https://www.alphavantage.co/query"
                + "?function=TIME_SERIES_DAILY&symbol=" + simbolo
                + "&outputsize=full&apikey=" + apiKey;

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
