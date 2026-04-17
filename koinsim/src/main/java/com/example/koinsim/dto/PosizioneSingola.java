package com.example.koinsim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public class PosizioneSingola {
        private String simbolo;
        private String tipoAsset;
        private Double quantita;
        private Double prezzoDiAcquisto;
        private Double prezzoAttuale;       //prezzo di 1 qnt di mercato
        private Double valoreAttuale;       //prezzoAttuale * quantita che voglio comprare/vendere
        private Double profitLoss;
        private Double profitLossPerc;
    }