package ma.intersig.fleetcore.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.registerCustomCache("vehicules-page",
                Caffeine.newBuilder().maximumSize(200).expireAfterWrite(60, TimeUnit.SECONDS).build());
        manager.registerCustomCache("composants-tree",
                Caffeine.newBuilder().maximumSize(50).expireAfterWrite(10, TimeUnit.MINUTES).build());
        manager.registerCustomCache("kpis",
                Caffeine.newBuilder().maximumSize(20).expireAfterWrite(60, TimeUnit.SECONDS).build());
        return manager;
    }
}
