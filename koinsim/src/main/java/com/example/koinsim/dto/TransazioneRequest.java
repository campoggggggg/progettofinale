package com.example.koinsim.dto;

import com.example.koinsim.model.TipoAsset;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransazioneRequest {

    private Long id;
    private String simbolo;
    private TipoAsset tipoAsset;
    private Double percentuale;      // % del budget iniziale (solo in input)
    private Double quantita;         // calcolato dal backend (solo in output)
    private Double prezzoDiAcquisto; // calcolato dal backend (solo in output)
    private LocalDate dataAcquisto;  // calcolato dal backend (solo in output)

}