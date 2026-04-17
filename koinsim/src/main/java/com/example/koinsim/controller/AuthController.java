package com.example.koinsim.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import com.example.koinsim.dto.LoginRequest;
import com.example.koinsim.dto.LoginResponse;
import com.example.koinsim.service.AuthService;

@RestController
@RequestMapping("api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/registrazione")
    public ResponseEntity<Void> registrazione(@RequestBody LoginRequest richiesta) {
        authService.registra(richiesta);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest richiesta) {
        return ResponseEntity.ok(authService.login(richiesta));
    }

    // Il body contiene { "refreshToken": "..." }
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(@RequestBody Map<String, String> body) {
        String nuovoToken = authService.refresh(body.get("refreshToken"));
        return ResponseEntity.ok(Map.of("accessToken", nuovoToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // Stateless puro: il logout avviene lato client cancellando i token
        return ResponseEntity.ok().build();
    }
}