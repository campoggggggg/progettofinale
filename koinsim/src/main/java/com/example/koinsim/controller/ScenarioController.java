package com.example.koinsim.controller;

import com.example.koinsim.dto.*;
import com.example.koinsim.service.MonteCarloService;
import com.example.koinsim.service.ScenarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scenari")
@RequiredArgsConstructor
public class ScenarioController {

    private final ScenarioService scenarioService;
    private final MonteCarloService monteCarloService;

    @PostMapping
    public ResponseEntity<ScenarioResponse> crea(
            @RequestBody ScenarioRequest richiesta,
            @AuthenticationPrincipal UserDetails utente) {
        return ResponseEntity.status(201).body(scenarioService.crea(richiesta, utente.getUsername()));
    }

    @GetMapping
    public ResponseEntity<List<ScenarioResponse>> lista(
            @AuthenticationPrincipal UserDetails utente) {
        return ResponseEntity.ok(scenarioService.lista(utente.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScenarioResponse> dettaglio(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails utente) {
        return ResponseEntity.ok(scenarioService.dettaglio(id, utente.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScenarioResponse> aggiorna(
            @PathVariable Long id,
            @RequestBody ScenarioRequest richiesta,
            @AuthenticationPrincipal UserDetails utente) {
        return ResponseEntity.ok(scenarioService.aggiorna(id, richiesta, utente.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> elimina(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails utente) {
        scenarioService.elimina(id, utente.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/transazioni")
    public ResponseEntity<Void> aggiungiTransazione(
            @PathVariable Long id,
            @RequestBody TransazioneScenarioRequest richiesta,
            @AuthenticationPrincipal UserDetails utente) {
        scenarioService.aggiungiTransazione(id, richiesta, utente.getUsername());
        return ResponseEntity.status(201).build();
    }

    @DeleteMapping("/{id}/transazioni/{transazioneId}")
    public ResponseEntity<Void> rimuoviTransazione(
            @PathVariable Long id,
            @PathVariable Long transazioneId,
            @AuthenticationPrincipal UserDetails utente) {
        scenarioService.rimuoviTransazione(id, transazioneId, utente.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/proiezioni")
    public ResponseEntity<ProiezioneScenario> proiezioni(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails utente) {
        return ResponseEntity.ok(scenarioService.proiezioni(id, utente.getUsername()));
    }

    @GetMapping("/{id}/montecarlo")
    public ResponseEntity<ProiezioneMonteCarlo> montecarlo(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails utente) {
        return ResponseEntity.ok(monteCarloService.simulaScenario(id, utente.getUsername()));
    }
}
