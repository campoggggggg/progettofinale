package com.example.koinsim.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    private static final long ACCESS_EXPIRY = 15 * 60 * 1000L; //15 minuti
    private static final long REFRESH_EXPIRY = 7 * 24 * 60 * 60 * 1000L; // 7 giorni

    private SecretKey chiave() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generaAccessToken(String nomeUtente) {
        return Jwts.builder()
                .subject(nomeUtente)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + ACCESS_EXPIRY))
                .signWith(chiave())
                .compact();
    }

    public String generaRefreshToken(String nomeUtente) {
        return Jwts.builder()
                .subject(nomeUtente)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + REFRESH_EXPIRY))
                .signWith(chiave())
                .compact();
    }

    public String estraiNomeUtente(String token) {
        return estraiClaims(token).getSubject();
    }

    public boolean isTokenValido(String token, String nomeUtente) {
        try {
            return estraiNomeUtente(token).equals(nomeUtente) && !isScaduto(token);
        } catch (Exception e) {
            return false;
        }
    }

    private Claims estraiClaims(String token) {
        return Jwts.parser()
                .verifyWith(chiave())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private boolean isScaduto(String token) {
        return estraiClaims(token).getExpiration().before(new Date());
    }
}
