package com.example.koinsim.service;

import com.example.koinsim.dto.ProiezioneScenario;
import com.example.koinsim.dto.ScenarioRequest;
import com.example.koinsim.dto.ScenarioResponse;
import com.example.koinsim.dto.TransazioneRequest;
import com.example.koinsim.dto.TransazioneScenarioRequest;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

public interface ScenarioService {

    /** Crea uno scenario per l'utente autenticato. budgetIniziale deve essere > 0. */
    ScenarioResponse crea(ScenarioRequest richiesta, String nomeUtente);

    /** Restituisce tutti gli scenari dell'utente, senza esporre dati altrui. */
    List<ScenarioResponse> lista(String nomeUtente);

    /**
     * Recupera uno scenario verificando l'ownership.
     * @throws AccessDeniedException se l'utente non è il proprietario
     * @throws EntityNotFoundException se l'id non esiste
     */
    ScenarioResponse dettaglio(Long id, String nomeUtente);

    /** Aggiorna nome e descrizione (budget non modificabile post-creazione). */
    ScenarioResponse aggiorna(Long id, ScenarioRequest richiesta, String nomeUtente);

    /** Elimina lo scenario con tutte le sue TransazioneScenario (cascade). */
    void elimina(Long id, String nomeUtente);

    /**
     * Aggiunge una transazione simulata allo scenario recuperando il prezzo storico.
     * @throws IllegalStateException se la spesa supera il budgetIniziale
     */
    void aggiungiTransazione(Long scenarioId, TransazioneRequest richiesta, String nomeUtente);

    /** Rimuove una singola transazione dallo scenario. */
    void rimuoviTransazione(Long scenarioId, Long transazioneId, String nomeUtente);

    /**
     * Calcola le proiezioni P&L a oggi, +6 mesi, +1 anno, +5 anni
     * a partire dalla data del primo acquisto nello scenario.
     */
    ProiezioneScenario proiezioni(Long scenarioId, String nomeUtente);
}
