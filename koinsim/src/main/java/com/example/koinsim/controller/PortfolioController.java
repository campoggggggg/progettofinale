package com.example.koinsim.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.example.koinsim.service.PortfolioService;

@RestController
public class PortfolioController {
    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @PostMapping("/api/transazioni")
    public ResponseEntity<Void> aggiungiTransazione(
            @RequestBody TransazioneRequest richiesta,
            Principal principal) {
        portfolioService.aggiungi(richiesta, principal.getName());
        return ResponseEntity.status(201).build();
    }

    @GetMapping("/api/transazioni")
    public ResponseEntity<List<Transazione>> listaTransazioni(Principal principal) {
        return ResponseEntity.ok(portfolioService.lista(principal.getName()));
    }

    @DeleteMapping("/api/transazioni/{id}")
    public ResponseEntity<Void> eliminaTransazione(
            @PathVariable Long id,
            Principal principal) {
        portfolioService.elimina(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/portafoglio")
    public ResponseEntity<RiepilogoPortafoglio> portafoglio(Principal principal) {
        return ResponseEntity.ok(portfolioService.calcolaPortafoglio(principal.getName()));
    }

    // Svuota entrambe le cache forzando il rinnovo dei prezzi al prossimo accesso
    @PostMapping("/api/cache/svuota")
    @CacheEvict(value = {"prezziCrypto", "prezziAzioni"}, allEntries = true)
    public ResponseEntity<Void> svuotaCache() {
        return ResponseEntity.ok().build();
    }
}
