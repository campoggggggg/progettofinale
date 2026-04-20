package com.example.koinsim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScenarioResponse {
    private Long id;
    private String nome;
    private String descrizione;
    private Double budgetIniziale;
    private Double budgetRimanente;
    private LocalDateTime dataCreazione;
    private List<TransazioneRequest> transazioni;
}
