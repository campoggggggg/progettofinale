package com.example.koinsim.dto;

import com.example.koinsim.model.TipoAsset;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransazioneRequest {

    private String simbolo;
    private TipoAsset tipoAsset;
    private Double quantita;

}