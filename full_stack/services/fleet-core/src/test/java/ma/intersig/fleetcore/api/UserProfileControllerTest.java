package ma.intersig.fleetcore.api;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class UserProfileControllerTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg17")
            .withDatabaseName("fleettracker_test");

    @LocalServerPort
    int port;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.baseline-on-migrate", () -> "true");
        registry.add("spring.flyway.locations", () -> "classpath:db/migrations-shared,classpath:db/migrations");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.mail.host", () -> "localhost");
        registry.add("spring.mail.port", () -> "1025");
    }

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
    }

    /**
     * Regression for the "Mon profil" save failing with SQLState 42804
     * ("column dashboard_config is of type jsonb but expression is of type
     * character varying"): a full-row UPDATE bound the jsonb columns as varchar.
     * Before the @JdbcTypeCode(SqlTypes.JSON) fix this PATCH returned 500.
     */
    @Test
    void patchMe_updatesProfileAndPersists() {
        // First set a real JSON object on a jsonb column to exercise the write path.
        given()
                .header("X-Authenticated-User-Id", "1")
                .contentType(ContentType.JSON)
                .body("{\"widgets\":[\"fleet-overview\"],\"v\":1}")
        .when()
                .put("/users/me/dashboard-config")
        .then()
                .statusCode(200);

        // The profile save that used to 500.
        given()
                .header("X-Authenticated-User-Id", "1")
                .contentType(ContentType.JSON)
                .body("{\"prenom\":\"Reda\",\"nom\":\"Bennani\",\"telephone\":\"0600112233\"}")
        .when()
                .patch("/users/me")
        .then()
                .statusCode(200)
                .body("prenom", equalTo("Reda"))
                .body("nom", equalTo("Bennani"))
                .body("telephone", equalTo("0600112233"));

        // Persisted across requests.
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/users/me")
        .then()
                .statusCode(200)
                .body("prenom", equalTo("Reda"))
                .body("nom", equalTo("Bennani"))
                .body("telephone", equalTo("0600112233"));

        // jsonb round-trips intact (guards against double-encoding from the JSON type):
        // the stored value must come back as a JSON object, not a quoted string.
        String config = given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/users/me/dashboard-config")
        .then()
                .statusCode(200)
                .extract().body().asString();

        org.assertj.core.api.Assertions.assertThat(config.trim()).startsWith("{");
        org.assertj.core.api.Assertions.assertThat(config).contains("\"widgets\"", "fleet-overview");
    }
}
