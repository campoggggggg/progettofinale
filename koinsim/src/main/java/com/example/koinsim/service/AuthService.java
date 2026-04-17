package com.example.koinsim.service;

import org.apache.catalina.User;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.koinsim.dto.LoginRequest;
import com.example.koinsim.dto.LoginResponse;
import com.example.koinsim.model.Utente;
import com.example.koinsim.repository.UtenteRepository;
import com.example.koinsim.security.JwtUtil;

@Service
public class AuthService implements UserDetailsService{

    private final UtenteRepository utenteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthService(UtenteRepository utenteRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       AuthenticationManager authenticationManager) {
        this.utenteRepository = utenteRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    // Chiamato internamente da Spring Security per caricare l'utente dal DB
    @Override
    public UserDetails loadUserByUsername(String nomeUtente) throws UsernameNotFoundException {
        Utente utente = utenteRepository.findByNomeUtente(nomeUtente)
                .orElseThrow(() -> new UsernameNotFoundException("Utente non trovato: " + nomeUtente));

        return User.withUsername(utente.getNomeUtente())
                .password(utente.getPassword())
                .roles(utente.getRuolo().replace("ROLE_", ""))
                .build();
    }

    public void registra(LoginRequest richiesta) {
        Utente utente = new Utente();
        utente.setNomeUtente(richiesta.getNomeUtente());
        utente.setEmail(richiesta.getEmail());
        utente.setPassword(passwordEncoder.encode(richiesta.getPassword()));
        utente.setRuolo("ROLE_USER");
        utenteRepository.save(utente);
    }

    public LoginResponse login(LoginRequest richiesta) {
        // authenticationManager verifica le credenziali usando loadUserByUsername
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        richiesta.getNomeUtente(),
                        richiesta.getPassword()
                )
        );
        String accessToken = jwtUtil.generaAccessToken(richiesta.getNomeUtente());
        String refreshToken = jwtUtil.generaRefreshToken(richiesta.getNomeUtente());
        return new LoginResponse(accessToken, refreshToken);
    }

    public String refresh(String refreshToken) {
        String nomeUtente = jwtUtil.estraiNomeUtente(refreshToken);
        if (!jwtUtil.isTokenValido(refreshToken, nomeUtente)) {
            throw new RuntimeException("Refresh token non valido o scaduto");
        }
        return jwtUtil.generaAccessToken(nomeUtente);
    }
}
