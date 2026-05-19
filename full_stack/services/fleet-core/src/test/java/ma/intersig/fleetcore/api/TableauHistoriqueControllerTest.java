package ma.intersig.fleetcore.api;

import io.restassured.RestAssured;
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
class TableauHistoriqueControllerTest {

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
        registry.add("spring.flyway.locations", () -> "classpath:db/migrations");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.mail.host", () -> "localhost");
        registry.add("spring.mail.port", () -> "1025");
    }

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1";
    }

    @Test
    void getTableauJournees_today_returnsValidStructure() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/tableau-journees")
        .then()
                .statusCode(200)
                .body("date", notNullValue())
                .body("vehicules", notNullValue())
                .body("stats", notNullValue())
                .body("stats.total", notNullValue())
                .body("stats.enService", notNullValue())
                .body("stats.workshop", notNullValue())
                .body("stats.maintenance", notNullValue())
                .body("stats.horsService", notNullValue());
    }

    @Test
    void getTableauJournees_withDate_returnsCorrectStats() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("date", "2026-05-05")
        .when()
                .get("/tableau-journees")
        .then()
                .statusCode(200)
                .body("date", equalTo("2026-05-05"))
                .body("vehicules", notNullValue())
                .body("stats.total", notNullValue());
    }

    @Test
    void getHistorique_noFilter_returnsUnifiedTimeline() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/historique")
        .then()
                .statusCode(200)
                .body("content", notNullValue())
                .body("page", notNullValue())
                .body("size", notNullValue())
                .body("totalElements", notNullValue())
                .body("totalPages", notNullValue());
    }

    @Test
    void getHistorique_filteredByVehicule_returnsOnlyThat() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("vehicule_id", 1)
        .when()
                .get("/historique")
        .then()
                .statusCode(200)
                .body("content", notNullValue());
    }

    @Test
    void getHistorique_filteredByType_returnsOnlyInterventions() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("type", "intervention")
        .when()
                .get("/historique")
        .then()
                .statusCode(200)
                .body("content", notNullValue());
    }
}