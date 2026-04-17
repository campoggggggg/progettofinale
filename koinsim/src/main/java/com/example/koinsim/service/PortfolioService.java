package com.example.koinsim.service;

import com.example.koinsim.dto.RiepilogoPortafoglio;
import com.example.koinsim.dto.TransazioneRequest;
import com.example.koinsim.model.Transazione;
import com.example.koinsim.model.Utente;
import com.example.koinsim.repository.TransazioneRepository;
import com.example.koinsim.repository.UtenteRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class PortfolioService {
    private final TransazioneRepository transazioneRepository;
    private final UtenteRepository utenteRepository;
    private final PrezzoService prezzoService;

    public PortfolioService(TransazioneRepository transazioneRepository,
                            UtenteRepository utenteRepository,
                            PrezzoService prezzoService) {
        this.transazioneRepository = transazioneRepository;
        this.utenteRepository = utenteRepository;
        this.prezzoService = prezzoService;
    }

    public void aggiungi(TransazioneRequest richiesta, String nomeUtente) {
        Utente utente = utenteRepository.findByNomeUtente(nomeUtente)
                .orElseThrow(() -> new RuntimeException("Utente non trovato"));

        Transazione t = new Transazione();
        t.setSimbolo(richiesta.getSimbolo());
        t.setTipoAsset(richiesta.getTipoAsset());
        t.setQuantita(richiesta.getQuantita());
        t.setPrezzoDiAcquisto(richiesta.getPrezzoDiAcquisto());
        t.setDataAcquisto(richiesta.getDataAcquisto());
        t.setUtente(utente);

        transazioneRepository.save(t);
    }

    public List<Transazione> lista(String nomeUtente) {
        Utente utente = utenteRepository.findByNomeUtente(nomeUtente)
                .orElseThrow(() -> new RuntimeException("Utente non trovato"));
        return transazioneRepository.findByUtenteId(utente.getId());
    }

    public void elimina(Long id, String nomeUtente) {
        Transazione t = transazioneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transazione non trovata"));

        // Sicurezza: un utente può eliminare solo le proprie transazioni
        if (!t.getUtente().getNomeUtente().equals(nomeUtente)) {
            throw new AccessDeniedException("Operazione non autorizzata");
        }
        transazioneRepository.deleteById(id);
    }

    public RiepilogoPortafoglio calcolaPortafoglio(String nomeUtente) {
        Utente utente = utenteRepository.findByNomeUtente(nomeUtente)
                .orElseThrow(() -> new RuntimeException("Utente non trovato"));

        List<Transazione> transazioni = transazioneRepository.findByUtenteId(utente.getId());

        // Raggruppa le transazioni per simbolo (es. tutti i Bitcoin insieme)
        Map<String, List<Transazione>> perSimbolo = transazioni.stream()
                .collect(Collectors.groupingBy(Transazione::getSimbolo));

        List<RiepilogoPortafoglio.RiepilogoAsset> riepilogo = perSimbolo.entrySet().stream()
                .map(entry -> {
                    String simbolo = entry.getKey();
                    List<Transazione> lista = entry.getValue();

                    double quantitaTotale = lista.stream()
                            .mapToDouble(Transazione::getQuantita).sum();

                    double costoTotale = lista.stream()
                            .mapToDouble(t -> t.getQuantita() * t.getPrezzoDiAcquisto()).sum();

                    Double prezzoCorrente = prezzoService.getPrezzo(
                            simbolo, lista.get(0).getTipoAsset());

                    if (prezzoCorrente == null) return null;

                    double valoreCorrente = quantitaTotale * prezzoCorrente;
                    double profittoPerdita = valoreCorrente - costoTotale;
                    double percentuale = (profittoPerdita / costoTotale) * 100;

                    return new RiepilogoPortafoglio.RiepilogoAsset(
                            simbolo, quantitaTotale, costoTotale,
                            valoreCorrente, profittoPerdita, percentuale);
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        double totale = riepilogo.stream()
                .mapToDouble(RiepilogoPortafoglio.RiepilogoAsset::getProfittoPerdita).sum();

        return new RiepilogoPortafoglio(riepilogo, totale);
    }
}
