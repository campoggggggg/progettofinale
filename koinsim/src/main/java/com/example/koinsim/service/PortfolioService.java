package com.example.koinsim.service;

import com.example.koinsim.dto.PosizioneSingola;
import com.example.koinsim.dto.RiepilogoPortafoglio;
import com.example.koinsim.dto.TransazioneRequest;
import com.example.koinsim.model.Transazione;
import com.example.koinsim.model.Utente;
import com.example.koinsim.repository.TransazioneRepository;
import com.example.koinsim.repository.UtenteRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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

                //recupera prezzo unità al momento dell'acquisto
                Double prezzoUnitario = prezzoService.getPrezzoStorico(
                        richiesta.getSimbolo(),
                        richiesta.getTipoAsset().name(),
                        LocalDate.now());

                if (prezzoUnitario == null) {
                        throw new RuntimeException("Impossibile recuperare il prezzo storico per " + richiesta.getSimbolo());
                }

                double costoTotale = prezzoUnitario * richiesta.getQuantita();

                Transazione t = new Transazione();
                t.setSimbolo(richiesta.getSimbolo());
                t.setTipoAsset(richiesta.getTipoAsset());
                t.setQuantita(richiesta.getQuantita());
                t.setDataAcquisto(LocalDate.now());
                t.setPrezzoDiAcquisto(costoTotale); //salva costo della transazione
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

                if (!t.getUtente().getNomeUtente().equals(nomeUtente)) {
                        throw new AccessDeniedException("Operazione non autorizzata");
                }
                transazioneRepository.deleteById(id);
        }

        public RiepilogoPortafoglio calcolaPortafoglio(String nomeUtente) {
                Utente utente = utenteRepository.findByNomeUtente(nomeUtente)
                                .orElseThrow(() -> new RuntimeException("Utente non trovato"));

                List<Transazione> transazioni = transazioneRepository.findByUtenteId(utente.getId());

                Map<String, List<Transazione>> perSimbolo = transazioni.stream()
                                .collect(Collectors.groupingBy(Transazione::getSimbolo));

                List<PosizioneSingola> posizioni = perSimbolo.entrySet().stream()
                                .map(entry -> {
                                        String simbolo = entry.getKey();
                                        List<Transazione> lista = entry.getValue();

                                        double quantitaTotale = lista.stream()
                                                        .mapToDouble(Transazione::getQuantita).sum();

                                        double costoTotale = lista.stream()
                                                        .mapToDouble(Transazione::getPrezzoDiAcquisto)
                                                        .sum();
                                        
                                        double prezzoMedioPerUnita = costoTotale / quantitaTotale;

                                        Double prezzoCorrente = prezzoService.getPrezzo(
                                                        simbolo, lista.get(0).getTipoAsset().name());

                                        if (prezzoCorrente == null)
                                                return null;

                                        double valoreAttuale = quantitaTotale * prezzoCorrente;
                                        double profitLoss = valoreAttuale - costoTotale;
                                        double profitLossPerc = (profitLoss / costoTotale) * 100;

                                        return new PosizioneSingola(
                                                        simbolo,
                                                        lista.get(0).getTipoAsset().name(),
                                                        quantitaTotale,
                                                        prezzoMedioPerUnita,
                                                        prezzoCorrente,
                                                        valoreAttuale,
                                                        profitLoss,
                                                        profitLossPerc);
                                })
                                .filter(Objects::nonNull)
                                .collect(Collectors.toList());

                double valoreGlobaleTotale = posizioni.stream()
                                .mapToDouble(PosizioneSingola::getValoreAttuale).sum();
                double costoTotaleGlobale = posizioni.stream()
                                .mapToDouble(p -> p.getQuantita() * p.getPrezzoDiAcquisto()).sum();
                double profitLossTotale = posizioni.stream()
                                .mapToDouble(PosizioneSingola::getProfitLoss).sum();
                double profitLossPercTotale = costoTotaleGlobale > 0
                                ? (profitLossTotale / costoTotaleGlobale) * 100
                                : 0;

                return new RiepilogoPortafoglio(posizioni, valoreGlobaleTotale, costoTotaleGlobale,
                                profitLossTotale, profitLossPercTotale);
        }
}
