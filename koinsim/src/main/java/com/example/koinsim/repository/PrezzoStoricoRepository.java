package com.example.koinsim.repository;

import com.example.koinsim.model.PrezzoStorico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface PrezzoStoricoRepository extends JpaRepository<PrezzoStorico, Long> {

    List<PrezzoStorico> findBySimboloAndFonteOrderByDataAsc(String simbolo, String fonte);

    List<PrezzoStorico> findBySimboloOrderByDataAsc(String simbolo);

    @Query("SELECT p.data FROM PrezzoStorico p WHERE p.simbolo = :simbolo AND p.fonte = :fonte")
    Set<LocalDate> findExistingDates(@Param("simbolo") String simbolo, @Param("fonte") String fonte);

    @Query("SELECT p.data FROM PrezzoStorico p WHERE p.simbolo = :simbolo")
    Set<LocalDate> findAllExistingDates(@Param("simbolo") String simbolo);

    @Query("SELECT MAX(p.data) FROM PrezzoStorico p WHERE p.simbolo = :simbolo AND p.fonte = :fonte")
    Optional<LocalDate> findLastDate(@Param("simbolo") String simbolo, @Param("fonte") String fonte);
}
