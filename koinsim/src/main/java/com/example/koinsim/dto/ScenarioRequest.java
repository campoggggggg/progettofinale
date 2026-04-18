package com.example.koinsim.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioRequest {
    private String nome;
    private String descrizione;
    private Double budgetIniziale;
}
