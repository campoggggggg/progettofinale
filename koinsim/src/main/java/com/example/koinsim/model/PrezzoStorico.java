package com.example.koinsim.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "prezzi_storici",
        uniqueConstraints = @UniqueConstraint(columnNames = {"simbolo", "data", "fonte"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrezzoStorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String simbolo;

    @Column(nullable = false)
    private LocalDate data;

    private Double open;
    private Double high;
    private Double low;

    @Column(nullable = false)
    private Double close;

    /** "ALPHA_VANTAGE" o "COINGECKO" */
    @Column(nullable = false)
    private String fonte;
}
