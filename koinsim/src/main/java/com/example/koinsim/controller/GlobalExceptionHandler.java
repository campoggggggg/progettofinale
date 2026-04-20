package com.example.koinsim.controller;

import com.example.koinsim.exception.ApiLimitException;
import com.example.koinsim.exception.DataPersistenceException;
import com.example.koinsim.exception.SymbolNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiLimitException.class)
    public ResponseEntity<Map<String, String>> handleApiLimit(ApiLimitException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", "API_LIMIT_REACHED", "message", ex.getMessage()));
    }

    @ExceptionHandler(SymbolNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleSymbolNotFound(SymbolNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "SYMBOL_NOT_FOUND", "message", ex.getMessage()));
    }

    @ExceptionHandler(DataPersistenceException.class)
    public ResponseEntity<Map<String, String>> handlePersistence(DataPersistenceException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "PERSISTENCE_ERROR", "message", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "VALIDATION_ERROR", "message", details));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(422)
                .body(Map.of("error", "PROCESSING_ERROR", "message", ex.getMessage()));
    }
}
