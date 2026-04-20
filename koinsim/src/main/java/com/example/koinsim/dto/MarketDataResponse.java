package com.example.koinsim.dto;

import com.example.koinsim.model.TipoAsset;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketDataResponse {

    private String symbol;
    private TipoAsset type;

    /** Rendimento medio logaritmico giornaliero: mean(ln(P_t / P_{t-1})) */
    private double mu;

    /** Deviazione standard dei log-return giornalieri (campionaria, N-1) */
    private double sigma;

    private int dataPoints;
    private LocalDate fromDate;
    private LocalDate toDate;

    /** true se il risultato proviene dalla cache Redis (nessuna chiamata API effettuata) */
    private boolean fromCache;
}
