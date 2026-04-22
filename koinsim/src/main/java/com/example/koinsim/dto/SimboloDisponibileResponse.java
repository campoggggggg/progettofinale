package com.example.koinsim.dto;

import com.example.koinsim.model.TipoAsset;

public class SimboloDisponibileResponse {

    private String simbolo;
    private TipoAsset tipoAsset;

    public SimboloDisponibileResponse(String simbolo, TipoAsset tipoAsset) {
        this.simbolo = simbolo;
        this.tipoAsset = tipoAsset;
    }

    public String getSimbolo() { return simbolo; }
    public TipoAsset getTipoAsset() { return tipoAsset; }
}
