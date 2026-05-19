package ma.intersig.gateway.auth;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthControllerTest {

    @LocalServerPort
    int port;

    @Autowired
    Flyway flyway;

    @Autowired
    DataSource dataSource;

    @Autowired
    Environment environment;

    private static String adminAccessToken;
    private static String adminRefreshToken;

    @BeforeAll
    void setUp() {
        String[] activeProfiles = environment.getActiveProfiles();
        boolean isTestProfile = java.util.Arrays.stream(activeProfiles)
            .anyMatch(profile -> profile.equals("test"));
        if (!isTestProfile) {
            throw new IllegalStateException("Tests must run with 'test' profile to prevent accidental data loss");
        }
        flyway.clean();
        flyway.migrate();
        RestAssured.port = port;
    }

    // ── Phase 3: US1 — Registration ──

    @Test
    @Order(1)
    void registerSuccess() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", "test@intersig.ma",
                "prenom", "Test",
                "nom", "User",
                "password", "testtest"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201)
            .body("access_token", not(blankOrNullString()))
            .body("refresh_token", not(blankOrNullString()))
            .body("user.email", equalTo("test@intersig.ma"))
            .body("user.prenom", equalTo("Test"))
            .body("user.nom", equalTo("User"));
    }

    @Test
    @Order(2)
    void registerDuplicateEmail() {
        String uniqueEmail = "duplicate_" + System.currentTimeMillis() + "@intersig.ma";

        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", uniqueEmail,
                "prenom", "First",
                "nom", "User",
                "password", "testtest"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", uniqueEmail,
                "prenom", "Second",
                "nom", "User",
                "password", "testtest"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(409)
            .body("code", equalTo("EMAIL_ALREADY_EXISTS"));
    }

    @Test
    void registerPasswordTooShort() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", "shortpw@intersig.ma",
                "prenom", "Test",
                "nom", "User",
                "password", "short"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(422)
            .body("code", equalTo("VALIDATION_ERROR"));
    }

    @Test
    void registerInvalidEmail() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", "notanemail",
                "prenom", "Test",
                "nom", "User",
                "password", "testtest"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(422)
            .body("code", equalTo("VALIDATION_ERROR"));
    }

    // ── Phase 4: US2 — Login & Session ──

    @Test
    @Order(10)
    void loginSuccess() {
        var response = given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", "admin@intersig.local",
                "password", "admin"
            ))
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(200)
            .body("access_token", not(blankOrNullString()))
            .body("refresh_token", not(blankOrNullString()))
            .body("user.email", equalTo("admin@intersig.local"))
            .body("user.prenom", equalTo("Admin"))
            .body("user.nom", equalTo("INTERSIG"))
            .extract();

        adminAccessToken = response.path("access_token").toString();
        adminRefreshToken = response.path("refresh_token").toString();
    }

    @Test
    @Order(11)
    void loginInvalidCredentials() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", "admin@intersig.local",
                "password", "wrongpassword"
            ))
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(401)
            .body("code", equalTo("INVALID_CREDENTIALS"));
    }

    @Test
    @Order(12)
    void loginRateLimitAfterFiveFailures() {
        String rateLimitEmail = "ratelimit_" + System.currentTimeMillis() + "@intersig.ma";

        // Register the user first so the email exists
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", rateLimitEmail,
                "prenom", "Rate",
                "nom", "Limit",
                "password", "testtest"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201);

        // 5 failed attempts should succeed (return 401 each time)
        for (int i = 0; i < 5; i++) {
            given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", rateLimitEmail, "password", "wrongpass"))
            .when()
                .post("/api/v1/auth/login")
            .then()
                .statusCode(401);
        }

        // 6th attempt should return 429
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", rateLimitEmail, "password", "wrongpass"))
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(429)
            .body("code", equalTo("RATE_LIMITED"))
            .header("Retry-After", notNullValue());
    }

    @Test
    @Order(20)
    void refreshTokenSuccess() {
        // Ensure we have tokens from login
        if (adminRefreshToken == null) {
            loginSuccess();
        }

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("refresh_token", adminRefreshToken))
        .when()
            .post("/api/v1/auth/refresh")
        .then()
            .statusCode(200)
            .body("access_token", not(blankOrNullString()));
    }

    @Test
    @Order(21)
    void refreshTokenInvalid() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("refresh_token", "invalid-token-value"))
        .when()
            .post("/api/v1/auth/refresh")
        .then()
            .statusCode(401)
            .body("code", equalTo("REFRESH_TOKEN_INVALID"));
    }

    @Test
    @Order(22)
    void refreshTokenExpired() throws SQLException {
        // Ensure we have tokens from login
        if (adminRefreshToken == null) {
            loginSuccess();
        }

        // Set the refresh token expiry to 1 hour ago via direct DB update
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                "UPDATE users SET refresh_token_expires_at = NOW() - INTERVAL '1 hour' " +
                "WHERE email = 'admin@intersig.local'"
            );
        }

        try {
            given()
                .contentType(ContentType.JSON)
                .body(Map.of("refresh_token", adminRefreshToken))
            .when()
                .post("/api/v1/auth/refresh")
            .then()
                .statusCode(401)
                .body("code", equalTo("REFRESH_TOKEN_EXPIRED"));
        } finally {
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                stmt.executeUpdate(
                    "UPDATE users SET refresh_token_expires_at = NOW() + INTERVAL '8 hours' " +
                    "WHERE email = 'admin@intersig.local'"
                );
            }
        }
    }

    @Test
    @Order(30)
    void logoutSuccess() {
        // Ensure we have an access token
        if (adminAccessToken == null) {
            loginSuccess();
        }

        given()
            .header("Authorization", "Bearer " + adminAccessToken)
        .when()
            .post("/api/v1/auth/logout")
        .then()
            .statusCode(204);
    }

    @Test
    @Order(31)
    void getMeSuccess() {
        // Get fresh tokens after logout invalidated the previous ones
        var response = given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", "admin@intersig.local", "password", "admin"))
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(200)
            .extract();

        String token = response.path("access_token").toString();

        given()
            .header("Authorization", "Bearer " + token)
        .when()
            .get("/api/v1/auth/me")
        .then()
            .statusCode(200)
            .body("email", equalTo("admin@intersig.local"))
            .body("prenom", equalTo("Admin"))
            .body("nom", equalTo("INTERSIG"));
    }

    @Test
    @Order(32)
    void getMeUnauthorized() {
        given()
        .when()
            .get("/api/v1/auth/me")
        .then()
            .statusCode(401);
    }

    // ── Phase 6: US4 — Password Change ──

    @Test
    @Order(40)
    void changePasswordSuccess() {
        String changeEmail = "changepw_" + System.currentTimeMillis() + "@intersig.ma";
        String originalPassword = "testtest";
        String newPassword = "newpassword";

        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", changeEmail,
                "prenom", "Change",
                "nom", "Password",
                "password", originalPassword
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201);

        var loginResponse = given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", changeEmail, "password", originalPassword))
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(200)
            .extract();

        String accessToken = loginResponse.path("access_token").toString();

        given()
            .header("Authorization", "Bearer " + accessToken)
            .contentType(ContentType.JSON)
            .body(Map.of(
                "current_password", originalPassword,
                "new_password", newPassword
            ))
        .when()
            .put("/api/v1/auth/me/password")
        .then()
            .statusCode(204);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", changeEmail, "password", newPassword))
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(200);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", changeEmail, "password", originalPassword))
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(401);
    }

    @Test
    @Order(41)
    void changePasswordWrongCurrent() {
        String wrongPwEmail = "wrongpw_" + System.currentTimeMillis() + "@intersig.ma";

        var regResponse = given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", wrongPwEmail,
                "prenom", "Wrong",
                "nom", "Pw",
                "password", "testtest"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201)
            .extract();

        String accessToken = regResponse.path("access_token").toString();

        given()
            .header("Authorization", "Bearer " + accessToken)
            .contentType(ContentType.JSON)
            .body(Map.of(
                "current_password", "wrongpassword",
                "new_password", "newpassword"
            ))
        .when()
            .put("/api/v1/auth/me/password")
        .then()
            .statusCode(422)
            .body("code", equalTo("WRONG_CURRENT_PASSWORD"));
    }

    @Test
    @Order(42)
    void changePasswordTooShort() {
        String shortPwEmail = "shortpw_" + System.currentTimeMillis() + "@intersig.ma";

        var regResponse = given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", shortPwEmail,
                "prenom", "Short",
                "nom", "Pw",
                "password", "testtest"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201)
            .extract();

        String accessToken = regResponse.path("access_token").toString();

        given()
            .header("Authorization", "Bearer " + accessToken)
            .contentType(ContentType.JSON)
            .body(Map.of(
                "current_password", "testtest",
                "new_password", "short"
            ))
        .when()
            .put("/api/v1/auth/me/password")
        .then()
            .statusCode(422)
            .body("code", equalTo("VALIDATION_ERROR"));
    }

    @Test
    @Order(43)
    void changePasswordSameAsCurrent() {
        String samePwEmail = "samepw_" + System.currentTimeMillis() + "@intersig.ma";

        var regResponse = given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", samePwEmail,
                "prenom", "Same",
                "nom", "Pw",
                "password", "testtest"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201)
            .extract();

        String accessToken = regResponse.path("access_token").toString();

        given()
            .header("Authorization", "Bearer " + accessToken)
            .contentType(ContentType.JSON)
            .body(Map.of(
                "current_password", "testtest",
                "new_password", "testtest"
            ))
        .when()
            .put("/api/v1/auth/me/password")
        .then()
            .statusCode(422)
            .body("code", equalTo("SAME_PASSWORD"));
    }
}