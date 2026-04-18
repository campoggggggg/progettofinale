package com.example.koinsim.repository;

import com.example.koinsim.model.TransazioneScenario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransazioneScenarioRepository extends JpaRepository<TransazioneScenario, Long> {

    /** Usato per calcolare il totale speso nello scenario. */
    List<TransazioneScenario> findByScenarioId(Long scenarioId);
}
