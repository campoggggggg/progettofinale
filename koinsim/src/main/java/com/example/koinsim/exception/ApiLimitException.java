package com.example.koinsim.exception;

public class ApiLimitException extends RuntimeException {
    public ApiLimitException(String message) {
        super(message);
    }
}
