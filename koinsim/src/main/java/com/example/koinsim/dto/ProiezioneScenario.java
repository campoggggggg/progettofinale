package com.example.koinsim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProiezioneScenario {

    private LocalDate dataInizioSimulazione;
    private Double costoTotale;

    private Punto odierno;
    private Punto seiMesi;
    private Punto unAnno;
    private Punto cinqueAnni;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Punto {
        private LocalDate data;
        private Double valorePortafoglio;
        private Double pnl;
        private Double pnlPerc;
        /** true se la data è futura: valore calcolato sul prezzo corrente */
        private boolean stimato;
    }
}
