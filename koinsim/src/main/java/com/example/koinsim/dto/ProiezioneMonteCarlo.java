package com.example.koinsim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Risposta completa della simulazione Monte Carlo per uno scenario,
 * contenente i risultati per i tre orizzonti temporali standard.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProiezioneMonteCarlo {

    /** ID dello scenario simulato. */
    private Long scenarioId;

    /** Data in cui è stata eseguita la simulazione. */
    private LocalDate dataSimulazione;

    /** Costo totale di acquisto di tutte le posizioni, in USD. */
    private double costoTotale;

    /** Numero di simulazioni Monte Carlo eseguite per orizzonte. */
    private int nSimulazioni;

    /** Risultato per l'orizzonte a 6 mesi (126 giorni di borsa). */
    private RisultatoMonteCarlo seiMesi;

    /** Risultato per l'orizzonte a 1 anno (252 giorni di borsa). */
    private RisultatoMonteCarlo unAnno;

    /** Risultato per l'orizzonte a 3 anni (756 giorni di borsa). */
    private RisultatoMonteCarlo treAnni;

    /** Risultato per l'orizzonte a 5 anni (1260 giorni di borsa). */
    private RisultatoMonteCarlo cinqueAnni;
}
