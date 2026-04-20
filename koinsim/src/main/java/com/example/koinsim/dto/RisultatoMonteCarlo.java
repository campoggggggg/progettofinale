package com.example.koinsim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Risultato della simulazione Monte Carlo per un singolo orizzonte temporale.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RisultatoMonteCarlo {

    /** Numero di giorni di borsa dell'orizzonte (126, 252, 1260). */
    private int orizzonteGiorni;

    /** Etichetta leggibile dell'orizzonte ("6 mesi", "1 anno", "5 anni"). */
    private String etichettaOrizzonte;

    /** Valore portafoglio al 10° percentile (scenario pessimistico), in USD. */
    private double percentile10;

    /** Valore portafoglio al 50° percentile (scenario mediano), in USD. */
    private double percentile50;

    /** Valore portafoglio al 90° percentile (scenario ottimistico), in USD. */
    private double percentile90;

    /** Valore corrente del portafoglio (baseline odierna), in USD. */
    private double valoreCorrente;

    /** P&amp;L mediano: percentile50 - costoTotale, in USD. */
    private double pnlMediano;

    /** P&amp;L mediano percentuale: pnlMediano / costoTotale * 100. */
    private double pnlMedianoPerc;
}
