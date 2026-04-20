package com.example.koinsim.service;

import com.example.koinsim.dto.MarketDataResponse;
import com.example.koinsim.dto.ProiezioneMonteCarlo;
import com.example.koinsim.dto.RisultatoMonteCarlo;
import com.example.koinsim.model.Scenario;
import com.example.koinsim.model.TransazioneScenario;
import com.example.koinsim.model.Utente;
import com.example.koinsim.repository.ScenarioRepository;
import com.example.koinsim.repository.UtenteRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.apache.commons.math3.distribution.NormalDistribution;
import org.apache.commons.math3.stat.descriptive.rank.Percentile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service per la simulazione Monte Carlo (Geometric Brownian Motion) di scenari di investimento.
 * Calcola la distribuzione del valore futuro del portafoglio su tre orizzonti temporali.
 */
@Service
@RequiredArgsConstructor
public class MonteCarloService {

    private static final int N_SIMULAZIONI = 10_000;
    private static final int GIORNI_SEI_MESI = 126;
    private static final int GIORNI_UN_ANNO = 252;
    private static final int GIORNI_CINQUE_ANNI = 1260;

    private final ScenarioRepository scenarioRepository;
    private final UtenteRepository utenteRepository;
    private final MarketDataService marketDataService;
    private final PrezzoService prezzoService;

    /**
     * Esegue la simulazione Monte Carlo per uno scenario su tre orizzonti temporali
     * (6 mesi, 1 anno, 5 anni) e restituisce la distribuzione dei valori del portafoglio.
     *
     * @param scenarioId  ID dello scenario da simulare
     * @param nomeUtente  username del proprietario dello scenario
     * @return {@link ProiezioneMonteCarlo} con i percentili 10°, 50°, 90° per ogni orizzonte
     * @throws EntityNotFoundException se lo scenario non esiste o non appartiene all'utente
     * @throws IllegalStateException   se lo scenario non contiene transazioni
     */
    @Transactional(readOnly = true)
    public ProiezioneMonteCarlo simulaScenario(Long scenarioId, String nomeUtente) {
        Utente utente = utenteRepository.findByNomeUtente(nomeUtente)
                .orElseThrow(() -> new EntityNotFoundException("Utente non trovato: " + nomeUtente));

        Scenario scenario = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new EntityNotFoundException("Scenario non trovato: " + scenarioId));

        if (!scenario.getUtente().getId().equals(utente.getId())) {
            throw new EntityNotFoundException("Scenario non trovato: " + scenarioId);
        }

        List<TransazioneScenario> transazioni = scenario.getTransazioni();
        if (transazioni == null || transazioni.isEmpty()) {
            throw new IllegalStateException("Lo scenario non ha transazioni");
        }

        // Fetch dati di mercato e prezzi correnti per ogni simbolo univoco
        Map<String, MarketDataResponse> datiMercato = new LinkedHashMap<>();
        Map<String, Double> prezziCorrenti = new LinkedHashMap<>();

        for (TransazioneScenario t : transazioni) {
            String simbolo = t.getTransazione().getSimbolo();
            if (!datiMercato.containsKey(simbolo)) {
                datiMercato.put(simbolo,
                        marketDataService.fetchAndPersistAll(simbolo, t.getTransazione().getTipoAsset()));
                prezziCorrenti.put(simbolo,
                        prezzoService.getPrezzo(simbolo, t.getTransazione().getTipoAsset().name()));
            }
        }

        // Media ponderata di mu e sigma per quantità (spec: stesso simbolo può comparire più volte)
        Map<String, Double> muPerSimbolo = new LinkedHashMap<>();
        Map<String, Double> sigmaPerSimbolo = new LinkedHashMap<>();

        Map<String, List<TransazioneScenario>> perSimbolo = transazioni.stream()
                .collect(Collectors.groupingBy(t -> t.getTransazione().getSimbolo()));

        for (Map.Entry<String, List<TransazioneScenario>> entry : perSimbolo.entrySet()) {
            String simbolo = entry.getKey();
            List<TransazioneScenario> gruppo = entry.getValue();
            MarketDataResponse md = datiMercato.get(simbolo);
            double totaleQty = gruppo.stream().mapToDouble(t -> t.getTransazione().getQuantita()).sum();
            muPerSimbolo.put(simbolo,
                    gruppo.stream().mapToDouble(t -> t.getTransazione().getQuantita() * md.getMu()).sum() / totaleQty);
            sigmaPerSimbolo.put(simbolo,
                    gruppo.stream().mapToDouble(t -> t.getTransazione().getQuantita() * md.getSigma()).sum() / totaleQty);
        }

        double costoTotale = transazioni.stream()
                .mapToDouble(t -> t.getTransazione().getPrezzoDiAcquisto() * t.getTransazione().getQuantita())
                .sum();

        double valoreCorrente = transazioni.stream()
                .mapToDouble(t -> prezziCorrenti.get(t.getTransazione().getSimbolo()) * t.getTransazione().getQuantita())
                .sum();

        double[] valoriSeiMesi = simulaPortafoglio(
                transazioni, muPerSimbolo, sigmaPerSimbolo, prezziCorrenti, GIORNI_SEI_MESI);
        double[] valoriUnAnno = simulaPortafoglio(
                transazioni, muPerSimbolo, sigmaPerSimbolo, prezziCorrenti, GIORNI_UN_ANNO);
        double[] valoriCinqueAnni = simulaPortafoglio(
                transazioni, muPerSimbolo, sigmaPerSimbolo, prezziCorrenti, GIORNI_CINQUE_ANNI);

        return ProiezioneMonteCarlo.builder()
                .scenarioId(scenarioId)
                .dataSimulazione(LocalDate.now())
                .costoTotale(costoTotale)
                .nSimulazioni(N_SIMULAZIONI)
                .seiMesi(calcolaRisultato(valoriSeiMesi, GIORNI_SEI_MESI, "6 mesi", valoreCorrente, costoTotale))
                .unAnno(calcolaRisultato(valoriUnAnno, GIORNI_UN_ANNO, "1 anno", valoreCorrente, costoTotale))
                .cinqueAnni(calcolaRisultato(valoriCinqueAnni, GIORNI_CINQUE_ANNI, "5 anni", valoreCorrente, costoTotale))
                .build();
    }

    /**
     * Simula il valore finale del portafoglio completo per {@code N_SIMULAZIONI} percorsi GBM.
     * Per ogni simbolo univoco viene simulato un percorso indipendente; il valore del portafoglio
     * per ogni simulazione è la somma {@code prezzo_simulato * quantità} su tutte le transazioni.
     *
     * @param transazioni      lista delle posizioni dello scenario
     * @param muPerSimbolo     rendimento medio log-return giornaliero per simbolo
     * @param sigmaPerSimbolo  deviazione standard log-return giornaliera per simbolo
     * @param prezziCorrenti   prezzo di mercato attuale per simbolo (punto di partenza GBM)
     * @param giorniOrizzonte  numero di giorni di borsa da simulare
     * @return array di lunghezza {@code N_SIMULAZIONI} con i valori finali del portafoglio
     */
    private double[] simulaPortafoglio(List<TransazioneScenario> transazioni,
                                        Map<String, Double> muPerSimbolo,
                                        Map<String, Double> sigmaPerSimbolo,
                                        Map<String, Double> prezziCorrenti,
                                        int giorniOrizzonte) {
        Map<String, double[]> valoriPerSimbolo = new LinkedHashMap<>();
        for (String simbolo : muPerSimbolo.keySet()) {
            valoriPerSimbolo.put(simbolo, simulaPercorsi(
                    prezziCorrenti.get(simbolo),
                    muPerSimbolo.get(simbolo),
                    sigmaPerSimbolo.get(simbolo),
                    giorniOrizzonte,
                    N_SIMULAZIONI));
        }

        double[] portafoglio = new double[N_SIMULAZIONI];
        for (int i = 0; i < N_SIMULAZIONI; i++) {
            for (TransazioneScenario t : transazioni) {
                portafoglio[i] += valoriPerSimbolo.get(t.getTransazione().getSimbolo())[i]
                        * t.getTransazione().getQuantita();
            }
        }
        return portafoglio;
    }

    /**
     * Esegue {@code nSimulazioni} percorsi GBM per un singolo asset e restituisce
     * i prezzi finali simulati.
     * Formula per ogni step giornaliero:
     * {@code S_t = S_{t-1} * exp((mu - sigma²/2) + sigma * Z)}, con Z ~ N(0,1).
     *
     * @param prezzoCorrente  prezzo di partenza dell'asset (oggi)
     * @param mu              rendimento medio log-return giornaliero
     * @param sigma           deviazione standard log-return giornaliera
     * @param giorniOrizzonte numero di giorni di borsa da simulare
     * @param nSimulazioni    numero di percorsi da generare
     * @return array di lunghezza {@code nSimulazioni} con i prezzi finali simulati
     */
    public double[] simulaPercorsi(double prezzoCorrente, double mu, double sigma,
                                    int giorniOrizzonte, int nSimulazioni) {
        NormalDistribution normale = new NormalDistribution();
        double[] valoriFinali = new double[nSimulazioni];
        double drift = mu - (sigma * sigma) / 2.0;

        for (int i = 0; i < nSimulazioni; i++) {
            double prezzo = prezzoCorrente;
            for (int t = 0; t < giorniOrizzonte; t++) {
                prezzo *= Math.exp(drift + sigma * normale.sample());
            }
            valoriFinali[i] = prezzo;
        }
        return valoriFinali;
    }

    /**
     * Calcola il percentile {@code p} su un array di valori finali simulati.
     *
     * @param valori array di valori su cui calcolare il percentile
     * @param p      percentile in formato decimale (es. 0.10, 0.50, 0.90)
     * @return valore corrispondente al percentile richiesto
     */
    public double calcolaPercentile(double[] valori, double p) {
        return new Percentile().evaluate(valori, p * 100.0);
    }

    /**
     * Calcola i tre percentili chiave (10°, 50°, 90°) e costruisce il {@link RisultatoMonteCarlo}
     * per un dato orizzonte temporale.
     *
     * @param valoriFinali   array dei valori finali del portafoglio per ogni simulazione
     * @param orizzonteGiorni numero di giorni di borsa dell'orizzonte
     * @param etichetta      etichetta leggibile dell'orizzonte (es. "6 mesi")
     * @param valoreCorrente valore attuale del portafoglio (baseline)
     * @param costoTotale    costo totale di acquisto delle posizioni
     * @return {@link RisultatoMonteCarlo} con percentili e P&amp;L mediano calcolati
     */
    public RisultatoMonteCarlo calcolaRisultato(double[] valoriFinali, int orizzonteGiorni,
                                                 String etichetta, double valoreCorrente,
                                                 double costoTotale) {
        double p10 = calcolaPercentile(valoriFinali, 0.10);
        double p50 = calcolaPercentile(valoriFinali, 0.50);
        double p90 = calcolaPercentile(valoriFinali, 0.90);
        double pnlMediano = p50 - costoTotale;
        double pnlMedianoPerc = costoTotale != 0.0 ? pnlMediano / costoTotale * 100.0 : 0.0;

        return RisultatoMonteCarlo.builder()
                .orizzonteGiorni(orizzonteGiorni)
                .etichettaOrizzonte(etichetta)
                .percentile10(p10)
                .percentile50(p50)
                .percentile90(p90)
                .valoreCorrente(valoreCorrente)
                .pnlMediano(pnlMediano)
                .pnlMedianoPerc(pnlMedianoPerc)
                .build();
    }
}
