package ma.intersig.gatewayproxy.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

public final class TestTokenHelper {

    public static final String SECRET =
            "change_me_to_at_least_64_chars_random_string_for_dev_only_000000";

    private static final SecretKey KEY =
            Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    public static String generateToken(long userId) {
        return generateToken(userId, "USER");
    }

    public static String generateToken(long userId, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("roles", List.of(role))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + 86_400_000L))
                .signWith(KEY, Jwts.SIG.HS256)
                .compact();
    }
}
