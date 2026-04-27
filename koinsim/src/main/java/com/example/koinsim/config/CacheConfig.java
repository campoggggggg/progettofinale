package com.example.koinsim.config;

import java.time.Duration;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;

/**
 * Configurazione della cache Redis per l'applicazione.
 * Abilita il supporto alla cache tramite @EnableCaching e definisce
 * le cache named per i prezzi di criptovalute e azioni.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Crea il gestore della cache Redis con due cache configurate:
     * - "prezziCrypto": per i prezzi delle criptovalute
     * - "prezziStock": per i prezzi delle azioni
     *
     * Entrambe le cache hanno un TTL di 5 minuti e non memorizzano valori null.
     *
     * @param factory la factory per la connessione a Redis
     * @return il RedisCacheManager configurato
     */
    @Bean
    public RedisCacheManager cacheManager (RedisConnectionFactory factory) {
        // Configurazione comune: TTL di 5 minuti, valori null esclusi dalla cache
        RedisCacheConfiguration configurazione = RedisCacheConfiguration
            .defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(5))
            .disableCachingNullValues();

        return RedisCacheManager.builder(factory)
            .withCacheConfiguration("prezziCrypto", configurazione)
            .withCacheConfiguration("prezziStock", configurazione)
            .build();
    }
}
