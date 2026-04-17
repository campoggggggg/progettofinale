package com.example.koinsim.config;

<<<<<<< Updated upstream
public class CacheConfig {
    
}
=======
import java.time.Duration;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager (RedisConnectionFactory factory) {
        RedisCacheConfiguration configurazione = RedisCacheConfiguration
            .defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(5))
            .disableCachingNullValues();

        return RedisCacheManager.builder(factory)
            .withCacheConfiguration("prezziCrypto", configurazione)
            .withCacheConfiguration("prezziAzioni", configurazione)
            .build();
    }
}
>>>>>>> Stashed changes
