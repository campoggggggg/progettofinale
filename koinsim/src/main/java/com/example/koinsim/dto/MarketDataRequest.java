package com.example.koinsim.dto;

import com.example.koinsim.model.TipoAsset;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MarketDataRequest {

    @NotBlank(message = "Il simbolo non può essere vuoto")
    private String symbol;

    @NotNull(message = "Il tipo asset è obbligatorio (CRYPTO o STOCK)")
    private TipoAsset type;
}
