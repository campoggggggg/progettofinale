package com.example.koinsim.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "transazioni")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transazione {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String simbolo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoAsset tipoAsset;

    @Column(nullable = false)
    private Double quantita;

    @Column(nullable = false)
    private Double prezzoDiAcquisto;

    @Column(nullable = false)
    private LocalDate dataAcquisto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utente_id", nullable = false)
    private Utente utente;

    public enum TipoAsset {
        CRYPTO, STOCK
    }
}
