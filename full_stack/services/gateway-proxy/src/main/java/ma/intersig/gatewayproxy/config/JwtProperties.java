package ma.intersig.gatewayproxy.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    private static final Logger log = LoggerFactory.getLogger(JwtProperties.class);

    static final String DEFAULT_DEV_SECRET =
            "change_me_to_at_least_64_chars_random_string_for_dev_only_000000";

    private String secret;

    @PostConstruct
    void validate() {
        if (secret == null || secret.isBlank()) {
            this.secret = DEFAULT_DEV_SECRET;
            log.warn("app.jwt.secret is not configured — using the dev placeholder. " +
                     "Set JWT_SECRET in production.");
        }
        if (secret.length() < 64) {
            throw new IllegalStateException(
                "app.jwt.secret must be at least 64 characters. " +
                "Generate one with: openssl rand -hex 64");
        }
    }

    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
}
