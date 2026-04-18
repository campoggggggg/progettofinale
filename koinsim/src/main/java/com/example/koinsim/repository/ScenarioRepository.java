package com.example.koinsim.repository;

import com.example.koinsim.model.Scenario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScenarioRepository extends JpaRepository<Scenario, Long> {

    /** Tutti gli scenari di un utente, ordinati per data creazione desc. */
    List<Scenario> findByUtenteIdOrderByDataCreazioneDesc(Long utenteId);

    /** Verifica ownership prima di operazioni mutanti. */
    boolean existsByIdAndUtenteId(Long id, Long utenteId);
}
