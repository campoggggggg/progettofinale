package com.example.koinsim.service;

import com.example.koinsim.model.Transazione;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
public class PrezzoService {
    private final WebClient webClient;

    @Value("${alpha.vantage.api.key}")
    private String apiKey;

    public PrezzoService(WebClient webClient) {
        this.webClient = webClient;
    }

    public Double getPrezzo(String simbolo, Transazione.TipoAsset tipoAsset) {
        return switch (tipoAsset) {
            case CRYPTO -> getPrezzoSimbolo(simbolo);
            case STOCK -> getPrezzoAzione(simbolo);
        };
    }

    @Cacheable(value = "prezziCrypto", key = "#simbolo")
    public Double getPrezzoSimbolo(String simbolo) {
        String url = "https://api.coingecko.com/api/v3/simple/price"
                + "?ids=" + simbolo + "&vs_currencies=usd";

        return webClient.get().uri(url).retrieve()
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

}
