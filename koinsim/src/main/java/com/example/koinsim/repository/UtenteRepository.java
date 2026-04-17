package com.example.koinsim.repository;

import com.example.koinsim.model.Utente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UtenteRepository extends JpaRepository<Utente, Long> {

    Optional<Utente> findByNomeUtente(String nomeUtente);

    boolean existsByNomeUtente(String nomeUtente);

    boolean existsByEmail(String email);
}
