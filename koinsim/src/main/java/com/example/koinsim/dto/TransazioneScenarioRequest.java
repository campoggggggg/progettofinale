package com.example.koinsim.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransazioneScenarioRequest {
    private Long scenarioId;
    private Long transazioneId;
}
