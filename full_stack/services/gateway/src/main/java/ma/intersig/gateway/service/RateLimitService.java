package ma.intersig.gateway.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import ma.intersig.gateway.exception.RateLimitException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
public class RateLimitService {

    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(1, TimeUnit.HOURS)
            .maximumSize(10_000)
            .build();

    @Value("${app.rate-limit.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.rate-limit.refill-seconds:30}")
    private int refillSeconds;

    public void recordFailure(String email) {
        Bucket bucket = buckets.get(email, k -> createBucket());
        if (!bucket.tryConsume(1)) {
            throw new RateLimitException(refillSeconds);
        }
    }

    public void resetBucket(String email) {
        buckets.invalidate(email);
    }

    private Bucket createBucket() {
        Bandwidth bandwidth = Bandwidth.classic(maxAttempts, Refill.greedy(1, Duration.ofSeconds(refillSeconds)));
        return Bucket.builder()
                .addLimit(bandwidth)
                .build();
    }
}