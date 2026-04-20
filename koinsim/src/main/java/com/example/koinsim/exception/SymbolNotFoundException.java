package com.example.koinsim.exception;

public class SymbolNotFoundException extends RuntimeException {
    public SymbolNotFoundException(String message) {
        super(message);
    }
}
