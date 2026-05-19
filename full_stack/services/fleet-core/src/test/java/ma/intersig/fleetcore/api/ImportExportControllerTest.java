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
class ImportExportControllerTest {

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
    void getImportFields_vehicules_returnsExpectedFields() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("entite", "vehicules")
        .when()
                .get("/import/excel/fields")
        .then()
                .statusCode(200)
                .body("entite", equalTo("vehicules"))
                .body("fields", hasItems("code", "statut", "chauffeur_nom", "chauffeur_prenom", "km_initial"));
    }

    @Test
    void exportExcel_vehicules_returnsXlsxContentType() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("entites", "vehicules")
        .when()
                .get("/export/excel")
        .then()
                .statusCode(200)
                .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @Test
    void getImportFields_composants_returnsExpectedFields() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("entite", "composants")
        .when()
                .get("/import/excel/fields")
        .then()
                .statusCode(200)
                .body("entite", equalTo("composants"))
                .body("fields", hasItems("reference", "designation", "parent_code"));
    }

    @Test
    void getImportFields_unknownEntity_returns404orError() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("entite", "unknown")
        .when()
                .get("/import/excel/fields")
        .then()
                .statusCode(anyOf(is(400), is(404)));
    }

    @Test
    void importHistorique_returnsPaginatedList() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/import/historique")
        .then()
                .statusCode(200)
                .body("content", notNullValue());
    }

    private static org.hamcrest.Matcher<Integer> anyOf(org.hamcrest.Matcher<Integer>... matchers) {
        return org.hamcrest.core.AnyOf.anyOf(matchers);
    }
}