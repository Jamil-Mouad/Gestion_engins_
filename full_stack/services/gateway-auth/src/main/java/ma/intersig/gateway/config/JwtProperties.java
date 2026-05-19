package ma.intersig.gateway.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Base64;

@Component
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {
    private static final Logger log = LoggerFactory.getLogger(JwtProperties.class);
    private static final String DEV_PROFILE = "dev";
    private static final String DEFAULT_SECRET_PLACEHOLDER = "change_me_to_at_least_64_chars_random_string_for_dev_only_000000";

    private final Environment environment;
    private String secret;
    private long accessTtlSeconds;
    private int refreshTtlHours;

    public JwtProperties(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void validate() {
        boolean isDevProfile = isDevActive();
        boolean isDefaultSecret = secret == null || secret.equals(DEFAULT_SECRET_PLACEHOLDER);

        if (isDefaultSecret) {
            if (isDevProfile) {
                generateRandomSecret();
                log.warn("⚠️  JWT_SECRET was not set. Generated a random secret for development. This secret will change on every restart.");
            } else {
                throw new IllegalStateException(
                    "app.jwt.secret (or APP_JWT_SECRET environment variable) must be set in non-dev environments. " +
                    "Set a strong (>= 64 character) random secret before deploying to production."
                );
            }
        }

        if (secret == null || secret.length() < 64) {
            throw new IllegalStateException("app.jwt.secret must be at least 64 characters");
        }
    }

    private boolean isDevActive() {
        String[] activeProfiles = environment.getActiveProfiles();
        for (String profile : activeProfiles) {
            if (profile.equals(DEV_PROFILE)) {
                return true;
            }
        }
        return false;
    }

    private void generateRandomSecret() {
        SecureRandom random = new SecureRandom();
        byte[] randomBytes = new byte[48];
        random.nextBytes(randomBytes);
        this.secret = Base64.getEncoder().encodeToString(randomBytes);
    }

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getAccessTtlSeconds() {
        return accessTtlSeconds;
    }

    public void setAccessTtlSeconds(long accessTtlSeconds) {
        this.accessTtlSeconds = accessTtlSeconds;
    }

    public int getRefreshTtlHours() {
        return refreshTtlHours;
    }

    public void setRefreshTtlHours(int refreshTtlHours) {
        this.refreshTtlHours = refreshTtlHours;
    }
}