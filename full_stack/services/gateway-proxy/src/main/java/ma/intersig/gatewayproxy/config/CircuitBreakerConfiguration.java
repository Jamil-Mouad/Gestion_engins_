package ma.intersig.gatewayproxy.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import org.springframework.cloud.circuitbreaker.resilience4j.ReactiveResilience4JCircuitBreakerFactory;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JConfigBuilder;
import org.springframework.cloud.client.circuitbreaker.Customizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Programmatic Resilience4j configuration for the gateway circuit breakers.
 *
 * <p>The project only depends on {@code spring-cloud-starter-circuitbreaker-reactor-resilience4j},
 * NOT {@code resilience4j-spring-boot3}. Without the latter, the {@code resilience4j.*} YAML
 * properties are NOT bound, so the Spring Cloud circuit breaker falls back to Resilience4j's
 * default TimeLimiter timeout of <b>1 second</b>. The AI chat route streams an LLM response whose
 * first token routinely takes several seconds, so the 1s default aborted every request with a
 * 504 — surfacing in the UI as "Erreur de connexion".</p>
 *
 * <p>{@code configureDefault} is applied to every breaker the factory creates (including
 * {@code ai-engine-cb}), so it reliably overrides the 1s default with a 120s window that
 * accommodates LLM streaming.</p>
 */
@Configuration
public class CircuitBreakerConfiguration {

    @Bean
    public Customizer<ReactiveResilience4JCircuitBreakerFactory> defaultCircuitBreakerCustomizer() {
        return factory -> factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
                .timeLimiterConfig(TimeLimiterConfig.custom()
                        .timeoutDuration(Duration.ofSeconds(120))
                        .cancelRunningFuture(false)
                        .build())
                .circuitBreakerConfig(CircuitBreakerConfig.custom()
                        .slidingWindowSize(5)
                        .failureRateThreshold(60f)
                        .waitDurationInOpenState(Duration.ofSeconds(30))
                        .build())
                .build());
    }
}
