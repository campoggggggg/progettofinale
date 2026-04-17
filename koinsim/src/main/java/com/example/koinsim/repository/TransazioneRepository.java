package com.example.koinsim.repository;

import com.example.koinsim.model.Transazione;
import com.example.koinsim.model.Utente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransazioneRepository extends JpaRepository<Transazione, Long> {

    List<Transazione> findByUtente(Utente utente);

    List<Transazione> findByUtenteId(Long utenteId);
}
