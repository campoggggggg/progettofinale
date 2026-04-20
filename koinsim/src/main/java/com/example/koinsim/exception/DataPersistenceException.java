package com.example.koinsim.exception;

public class DataPersistenceException extends RuntimeException {
    public DataPersistenceException(String message, Throwable cause) {
        super(message, cause);
    }
}
