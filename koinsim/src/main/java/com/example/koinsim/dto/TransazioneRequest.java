package com.example.koinsim.dto;

import com.example.koinsim.model.Transazione.TipoAsset;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransazioneRequest {

    private String simbolo;
    private TipoAsset tipoAsset;
    private Double quantita;
    private Double prezzoDiAcquisto;
    private LocalDate dataAcquisto;
}
