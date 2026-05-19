package ma.intersig.gateway.auth;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PasswordResetControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        JavaMailSender mailSender() {
            JavaMailSender mockSender = mock(JavaMailSender.class);
            doNothing().when(mockSender).send(any(MimeMessage.class));
            when(mockSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
            return mockSender;
        }
    }

    @LocalServerPort
    int port;

    @Autowired
    Flyway flyway;

    @Autowired
    DataSource dataSource;

    @Autowired
    Environment environment;

    private static String resetEmail = "reset_" + System.currentTimeMillis() + "@intersig.ma";
    private static String resetOtp;
    private static String resetToken;

    @BeforeAll
    void setUp() {
        String[] activeProfiles = environment.getActiveProfiles();
        boolean isTestProfile = java.util.Arrays.stream(activeProfiles)
            .anyMatch(profile -> profile.equals("test"));
        if (!isTestProfile) {
            throw new IllegalStateException("Tests must run with 'test' profile");
        }
        flyway.clean();
        flyway.migrate();
        RestAssured.port = port;
    }

    // -----------------------------------------------------------------------
    // Order 1: register + request OTP for the main happy-path user
    // -----------------------------------------------------------------------

    @Test
    @Order(1)
    void requestResetKnownEmail() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", resetEmail,
                "prenom", "Reset",
                "nom", "User",
                "password", "testpassword"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", resetEmail))
        .when()
            .post("/api/v1/auth/password-reset/request")
        .then()
            .statusCode(204);
    }

    // -----------------------------------------------------------------------
    // Order 2: unknown email → 204 (no leak)
    // -----------------------------------------------------------------------

    @Test
    @Order(2)
    void requestResetUnknownEmail() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", "unknown@example.com"))
        .when()
            .post("/api/v1/auth/password-reset/request")
        .then()
            .statusCode(204);
    }

    // -----------------------------------------------------------------------
    // Order 3: verify with invalid code → 422 INVALID_OTP
    // -----------------------------------------------------------------------

    @Test
    @Order(3)
    void verifyWithInvalidCode() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", resetEmail,
                "code", "000000"
            ))
        .when()
            .post("/api/v1/auth/password-reset/verify")
        .then()
            .statusCode(422)
            .body("code", equalTo("INVALID_OTP"));
    }

    // -----------------------------------------------------------------------
    // Order 4: verify with expired OTP → 422 OTP_EXPIRED
    // -----------------------------------------------------------------------

    @Test
    @Order(4)
    void verifyWithExpiredOtp() throws SQLException {
        String expiredEmail = "expired_" + System.currentTimeMillis() + "@intersig.ma";

        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", expiredEmail,
                "prenom", "Expired",
                "nom", "Otp",
                "password", "testpassword"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", expiredEmail))
        .when()
            .post("/api/v1/auth/password-reset/request")
        .then()
            .statusCode(204);

        String expiredOtp;
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            var rs = stmt.executeQuery(
                "SELECT password_reset_otp FROM users WHERE email = '" + expiredEmail + "'"
            );
            rs.next();
            expiredOtp = rs.getString("password_reset_otp");

            stmt.executeUpdate(
                "UPDATE users SET password_reset_otp_expires_at = NOW() - INTERVAL '1 hour' " +
                "WHERE email = '" + expiredEmail + "'"
            );
        }

        try {
            given()
                .contentType(ContentType.JSON)
                .body(Map.of(
                    "email", expiredEmail,
                    "code", expiredOtp
                ))
            .when()
                .post("/api/v1/auth/password-reset/verify")
            .then()
                .statusCode(422)
                .body("code", equalTo("OTP_EXPIRED"));
        } finally {
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                stmt.executeUpdate(
                    "UPDATE users SET password_reset_otp_expires_at = NOW() + INTERVAL '15 minutes' " +
                    "WHERE email = '" + expiredEmail + "'"
                );
            }
        }
    }

    // -----------------------------------------------------------------------
    // Order 5: verify valid OTP → 200 with reset_token
    // -----------------------------------------------------------------------

    @Test
    @Order(5)
    void verifyOtpSuccess() throws SQLException {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            var rs = stmt.executeQuery(
                "SELECT password_reset_otp FROM users WHERE email = '" + resetEmail + "'"
            );
            rs.next();
            resetOtp = rs.getString("password_reset_otp");
        }

        resetToken = given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", resetEmail,
                "code", resetOtp
            ))
        .when()
            .post("/api/v1/auth/password-reset/verify")
        .then()
            .statusCode(200)
            .body("reset_token", notNullValue())
            .extract().path("reset_token");
    }

    // -----------------------------------------------------------------------
    // Order 6: confirm with wrong reset_token → 422 INVALID_OTP
    // -----------------------------------------------------------------------

    @Test
    @Order(6)
    void confirmWithInvalidToken() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", resetEmail,
                "reset_token", "this-is-a-wrong-token",
                "new_password", "newpassword8"
            ))
        .when()
            .post("/api/v1/auth/password-reset/confirm")
        .then()
            .statusCode(422)
            .body("code", equalTo("INVALID_OTP"));
    }

    // -----------------------------------------------------------------------
    // Order 7: confirm with expired reset_token → 422 OTP_EXPIRED
    // -----------------------------------------------------------------------

    @Test
    @Order(7)
    void confirmWithExpiredToken() throws SQLException {
        String expTokenEmail = "exptoken_" + System.currentTimeMillis() + "@intersig.ma";

        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", expTokenEmail,
                "prenom", "Exp",
                "nom", "Token",
                "password", "testpassword"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", expTokenEmail))
        .when()
            .post("/api/v1/auth/password-reset/request")
        .then()
            .statusCode(204);

        String otp;
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            var rs = stmt.executeQuery(
                "SELECT password_reset_otp FROM users WHERE email = '" + expTokenEmail + "'"
            );
            rs.next();
            otp = rs.getString("password_reset_otp");
        }

        String token = given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", expTokenEmail, "code", otp))
        .when()
            .post("/api/v1/auth/password-reset/verify")
        .then()
            .statusCode(200)
            .extract().path("reset_token");

        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(
                "UPDATE users SET password_reset_token_expires_at = NOW() - INTERVAL '1 hour' " +
                "WHERE email = '" + expTokenEmail + "'"
            );
        }

        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", expTokenEmail,
                "reset_token", token,
                "new_password", "newpassword8"
            ))
        .when()
            .post("/api/v1/auth/password-reset/confirm")
        .then()
            .statusCode(422)
            .body("code", equalTo("OTP_EXPIRED"));
    }

    // -----------------------------------------------------------------------
    // Order 8: confirm success → new password works, old does not
    // -----------------------------------------------------------------------

    @Test
    @Order(8)
    void confirmResetSuccess() {
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", resetEmail,
                "reset_token", resetToken,
                "new_password", "newpassword8"
            ))
        .when()
            .post("/api/v1/auth/password-reset/confirm")
        .then()
            .statusCode(204);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", resetEmail, "password", "newpassword8"))
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(200);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", resetEmail, "password", "testpassword"))
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(401);
    }

    // -----------------------------------------------------------------------
    // Order 9: used OTP cannot be re-verified
    // -----------------------------------------------------------------------

    @Test
    @Order(9)
    void verifyUsedOtp() throws SQLException {
        String usedEmail = "used_" + System.currentTimeMillis() + "@intersig.ma";

        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", usedEmail,
                "prenom", "Used",
                "nom", "Code",
                "password", "testpassword"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", usedEmail))
        .when()
            .post("/api/v1/auth/password-reset/request")
        .then()
            .statusCode(204);

        String usedOtp;
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            var rs = stmt.executeQuery(
                "SELECT password_reset_otp FROM users WHERE email = '" + usedEmail + "'"
            );
            rs.next();
            usedOtp = rs.getString("password_reset_otp");
        }

        // First verify → succeeds
        String token = given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", usedEmail, "code", usedOtp))
        .when()
            .post("/api/v1/auth/password-reset/verify")
        .then()
            .statusCode(200)
            .extract().path("reset_token");

        // Complete the reset
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", usedEmail,
                "reset_token", token,
                "new_password", "newpassword8"
            ))
        .when()
            .post("/api/v1/auth/password-reset/confirm")
        .then()
            .statusCode(204);

        // Second verify with same OTP → 422 INVALID_OTP (otp_used_at is set)
        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", usedEmail, "code", usedOtp))
        .when()
            .post("/api/v1/auth/password-reset/verify")
        .then()
            .statusCode(422)
            .body("code", equalTo("INVALID_OTP"));
    }

    // -----------------------------------------------------------------------
    // Order 10: short password → 422 VALIDATION_ERROR (bean validation on /confirm)
    // -----------------------------------------------------------------------

    @Test
    @Order(10)
    void confirmResetPasswordTooShort() {
        String shortPwEmail = "shortpwreset_" + System.currentTimeMillis() + "@intersig.ma";

        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", shortPwEmail,
                "prenom", "Short",
                "nom", "Pw",
                "password", "testpassword"
            ))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201);

        given()
            .contentType(ContentType.JSON)
            .body(Map.of("email", shortPwEmail))
        .when()
            .post("/api/v1/auth/password-reset/request")
        .then()
            .statusCode(204);

        // reset_token is a valid non-blank string but new_password is too short
        // Bean validation fires before service is called → 422 VALIDATION_ERROR
        given()
            .contentType(ContentType.JSON)
            .body(Map.of(
                "email", shortPwEmail,
                "reset_token", "some-valid-looking-token",
                "new_password", "short"
            ))
        .when()
            .post("/api/v1/auth/password-reset/confirm")
        .then()
            .statusCode(422)
            .body("code", equalTo("VALIDATION_ERROR"));
    }
}
