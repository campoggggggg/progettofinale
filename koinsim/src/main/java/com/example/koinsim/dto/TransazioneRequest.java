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
    private Double quantita;
    private Double prezzoDiAcquisto;
    private LocalDate dataAcquisto;

}