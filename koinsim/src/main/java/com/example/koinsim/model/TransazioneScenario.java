package com.example.koinsim.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "transazioni_scenario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransazioneScenario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String simbolo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Transazione.TipoAsset tipoAsset;

    @Column(nullable = false)
    private Double quantita;

    /** Prezzo unitario storico al momento dell'acquisto simulato */
    @Column(nullable = false)
    private Double prezzoUnitario;

    @Column(nullable = false)
    private LocalDate dataAcquisto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scenario_id", nullable = false)
    private Scenario scenario;
}
