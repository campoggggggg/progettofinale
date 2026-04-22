package com.example.koinsim.controller;

import com.example.koinsim.dto.MarketDataRequest;
import com.example.koinsim.dto.MarketDataResponse;
import com.example.koinsim.service.MarketDataService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/market-data")
public class MarketDataController {

    private final MarketDataService marketDataService;

    public MarketDataController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    /**
     * Recupera i dati storici per il simbolo richiesto (STOCK o CRYPTO),
     * li persiste su MySQL + CSV + Redis e restituisce mu e sigma
     * calcolati sui log-return, pronti per la simulazione Monte Carlo.
     *
     * Protetto da JWT: include "Authorization: Bearer <token>" nell'header.
     *
     * Esempi di body:
     *   { "symbol": "AAPL",    "type": "STOCK"  }
     *   { "symbol": "bitcoin", "type": "CRYPTO" }
     */
    @PostMapping("/fetch")
    public ResponseEntity<MarketDataResponse> fetch(@Valid @RequestBody MarketDataRequest request) {
        MarketDataResponse response = marketDataService.fetchAndPersistAll(
                request.getSymbol(), request.getType(), request.getStooqSymbol());
        return ResponseEntity.ok(response);
    }
}
