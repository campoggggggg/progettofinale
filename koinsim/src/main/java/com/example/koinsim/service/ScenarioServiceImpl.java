package com.example.koinsim.service;

import com.example.koinsim.dto.*;
import com.example.koinsim.model.Scenario;
import com.example.koinsim.model.TipoAsset;
import com.example.koinsim.model.Transazione;
import com.example.koinsim.model.TransazioneScenario;
import com.example.koinsim.model.Utente;
import com.example.koinsim.repository.ScenarioRepository;
import com.example.koinsim.repository.TransazioneRepository;
import com.example.koinsim.repository.TransazioneScenarioRepository;
import com.example.koinsim.repository.UtenteRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScenarioServiceImpl implements ScenarioService {

    private final ScenarioRepository scenarioRepository;
    private final TransazioneScenarioRepository transazioneScenarioRepository;
    private final TransazioneRepository transazioneRepository;
    private final UtenteRepository utenteRepository;
    private final PrezzoService prezzoService;

    @Override
    @Transactional
    public ScenarioResponse crea(ScenarioRequest richiesta, String nomeUtente) {
        if (richiesta.getBudgetIniziale() == null || richiesta.getBudgetIniziale() <= 0) {
            throw new IllegalArgumentException("Il budget iniziale deve essere maggiore di zero");
        }
        Utente utente = trovaUtente(nomeUtente);
        Scenario scenario = Scenario.builder()
                .nome(richiesta.getNome())
                .descrizione(richiesta.getDescrizione())
                .budgetIniziale(richiesta.getBudgetIniziale())
                .dataCreazione(LocalDateTime.now())
                .utente(utente)
                .build();
        return toResponse(scenarioRepository.save(scenario));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ScenarioResponse> lista(String nomeUtente) {
        Utente utente = trovaUtente(nomeUtente);
        return scenarioRepository.findByUtenteIdOrderByDataCreazioneDesc(utente.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ScenarioResponse dettaglio(Long id, String nomeUtente) {
        return toResponse(trovaConOwnership(id, nomeUtente));
    }

    @Override
    @Transactional
    public ScenarioResponse aggiorna(Long id, ScenarioRequest richiesta, String nomeUtente) {
        Scenario scenario = trovaConOwnership(id, nomeUtente);
        scenario.setNome(richiesta.getNome());
        scenario.setDescrizione(richiesta.getDescrizione());
        return toResponse(scenarioRepository.save(scenario));
    }

    @Override
    @Transactional
    public void elimina(Long id, String nomeUtente) {
        Scenario scenario = trovaConOwnership(id, nomeUtente);
        scenarioRepository.delete(scenario);
    }

    @Override
    @Transactional
    public void aggiungiTransazione(Long scenarioId, TransazioneRequest richiesta, String nomeUtente) {
        Scenario scenario = trovaConOwnership(scenarioId, nomeUtente);

        double prezzoUnitario = prezzoService.getPrezzo(
                richiesta.getSimbolo(),
                richiesta.getTipoAsset().name());

        double importo = scenario.getBudgetIniziale() * richiesta.getPercentuale() / 100.0;
        double quantita = importo / prezzoUnitario;
        double spesaAttuale = costoTotale(scenario.getTransazioni());

        if (spesaAttuale + importo > scenario.getBudgetIniziale()) {
            throw new IllegalStateException(
                    "Spesa totale supererebbe il budget iniziale di " + scenario.getBudgetIniziale());
        }

        Transazione transazione = transazioneRepository.save(Transazione.builder()
                .simbolo(richiesta.getSimbolo())
                .tipoAsset(richiesta.getTipoAsset())
                .quantita(quantita)
                .prezzoDiAcquisto(prezzoUnitario)
                .dataAcquisto(LocalDate.now())
                .utente(scenario.getUtente())
                .build());

        transazioneScenarioRepository.save(TransazioneScenario.builder()
                .transazione(transazione)
                .scenario(scenario)
                .build());
    }

    @Override
    @Transactional
    public void rimuoviTransazione(Long scenarioId, Long transazioneId, String nomeUtente) {
        trovaConOwnership(scenarioId, nomeUtente);
        TransazioneScenario t = transazioneScenarioRepository.findById(transazioneId)
                .orElseThrow(() -> new EntityNotFoundException("Transazione non trovata"));
        if (!t.getScenario().getId().equals(scenarioId)) {
            throw new AccessDeniedException("La transazione non appartiene a questo scenario");
        }
        transazioneScenarioRepository.delete(t);
    }

    @Override
    @Transactional(readOnly = true)
    public ProiezioneScenario proiezioni(Long scenarioId, String nomeUtente) {
        Scenario scenario = trovaConOwnership(scenarioId, nomeUtente);
        List<TransazioneScenario> transazioni = scenario.getTransazioni();

        if (transazioni.isEmpty()) {
            return ProiezioneScenario.builder().costoTotale(0.0).build();
        }

        LocalDate dataInizio = transazioni.stream()
                .map(t -> t.getTransazione().getDataAcquisto())
                .min(Comparator.naturalOrder())
                .orElse(LocalDate.now());

        double costo = costoTotale(transazioni);

        return ProiezioneScenario.builder()
                .dataInizioSimulazione(dataInizio)
                .costoTotale(costo)
                .odierno(calcolaPunto(transazioni, LocalDate.now(), costo))
                .seiMesi(calcolaPunto(transazioni, dataInizio.plusMonths(6), costo))
                .unAnno(calcolaPunto(transazioni, dataInizio.plusYears(1), costo))
                .cinqueAnni(calcolaPunto(transazioni, dataInizio.plusYears(5), costo))
                .build();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private double costoTotale(List<TransazioneScenario> transazioni) {
        return transazioni.stream()
                .mapToDouble(t -> t.getTransazione().getPrezzoDiAcquisto() * t.getTransazione().getQuantita())
                .sum();
    }

    private ProiezioneScenario.Punto calcolaPunto(
            List<TransazioneScenario> transazioni, LocalDate data, double costoTotale) {

        LocalDate oggi = LocalDate.now();
        boolean stimato = data.isAfter(oggi);

        record AssetKey(String simbolo, TipoAsset tipoAsset) {}
        Map<AssetKey, Double> qtaPerAsset = new HashMap<>();
        for (TransazioneScenario t : transazioni) {
            Transazione tr = t.getTransazione();
            qtaPerAsset.merge(new AssetKey(tr.getSimbolo(), tr.getTipoAsset()), tr.getQuantita(), (a, b) -> a + b);
        }

        double valore = 0.0;
        for (var entry : qtaPerAsset.entrySet()) {
            String simbolo = entry.getKey().simbolo();
            String tipo = entry.getKey().tipoAsset().name();
            double qta = entry.getValue();
            try {
                double prezzo = (stimato || data.equals(oggi))
                        ? prezzoService.getPrezzo(simbolo, tipo)
                        : prezzoService.getPrezzoStorico(simbolo, tipo, data);
                valore += prezzo * qta;
            } catch (Exception ignored) {
                // prezzo non disponibile per questa data: asset escluso
            }
        }

        double pnl = valore - costoTotale;
        double pnlPerc = costoTotale > 0 ? (pnl / costoTotale) * 100 : 0;

        return ProiezioneScenario.Punto.builder()
                .data(data)
                .valorePortafoglio(valore)
                .pnl(pnl)
                .pnlPerc(pnlPerc)
                .stimato(stimato)
                .build();
    }

    private Utente trovaUtente(String nomeUtente) {
        return utenteRepository.findByNomeUtente(nomeUtente)
                .orElseThrow(() -> new EntityNotFoundException("Utente non trovato: " + nomeUtente));
    }

    private Scenario trovaConOwnership(Long scenarioId, String nomeUtente) {
        Utente utente = trovaUtente(nomeUtente);
        Scenario scenario = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new EntityNotFoundException("Scenario non trovato: " + scenarioId));
        if (!scenario.getUtente().getId().equals(utente.getId())) {
            throw new AccessDeniedException("Non autorizzato ad accedere a questo scenario");
        }
        return scenario;
    }

    private ScenarioResponse toResponse(Scenario scenario) {
        double spesa = costoTotale(scenario.getTransazioni());

        List<TransazioneRequest> transazioniDto = scenario.getTransazioni().stream()
                .map(t -> {
                    Transazione tr = t.getTransazione();
                    return TransazioneRequest.builder()
                            .id(t.getId())
                            .simbolo(tr.getSimbolo())
                            .tipoAsset(tr.getTipoAsset())
                            .quantita(tr.getQuantita())
                            .prezzoDiAcquisto(tr.getPrezzoDiAcquisto())
                            .dataAcquisto(tr.getDataAcquisto())
                            .build();
                })
                .collect(Collectors.toList());

        return ScenarioResponse.builder()
                .id(scenario.getId())
                .nome(scenario.getNome())
                .descrizione(scenario.getDescrizione())
                .budgetIniziale(scenario.getBudgetIniziale())
                .budgetRimanente(scenario.getBudgetIniziale() - spesa)
                .dataCreazione(scenario.getDataCreazione())
                .transazioni(transazioniDto)
                .build();
    }
}
