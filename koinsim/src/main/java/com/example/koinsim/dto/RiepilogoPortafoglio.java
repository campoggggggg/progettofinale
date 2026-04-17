package com.example.koinsim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiepilogoPortafoglio {

    private List<PosizioneSingola> posizioni;
    private Double valoreGlobaleTotale;
    private Double costoTotale;
    private Double profitLossTotale;
    private Double profitLossPercTotale;

}
