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



import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class InterventionControllerTest {

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

    @Test
    void createCorrectiveIntervention_coutTotal_computedByDB() {
        Long vehiculeId = createTestVehicule();
        Map<String, Object> body = Map.of(
                "vehiculeId", vehiculeId,
                "typeInterventionId", 1,
                "categorie", "corrective",
                "dateDebut", "2026-05-05T08:00:00Z",
                "coutPieces", 1500.00,
                "coutMainOeuvre", 300.00,
                "coutSousTraitance", 0.00
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/interventions")
        .then()
                .statusCode(201)
                .body("coutTotal", notNullValue())
                .body("coutPieces", equalTo(1500.0f))
                .body("coutMainOeuvre", equalTo(300.0f));
    }

    @Test
    void cloturer_setsDateFin() {
        Long vehiculeId = createTestVehicule();
        Map<String, Object> body = Map.of(
                "vehiculeId", vehiculeId,
                "typeInterventionId", 1,
                "categorie", "preventive",
                "dateDebut", "2026-05-01T08:00:00Z",
                "coutPieces", 500.00,
                "coutMainOeuvre", 100.00,
                "coutSousTraitance", 0.00
        );

        Long id = ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/interventions")
        .then()
                .statusCode(201)
                .extract()
                .path("id")).longValue();

        given()
                .header("X-Authenticated-User-Id", "1")
                .contentType(ContentType.JSON)
        .when()
                .patch("/interventions/" + id + "/cloturer")
        .then()
                .statusCode(200)
                .body("dateFin", notNullValue());
    }

    @Test
    void filter_byCategorie_returnsOnly_matching() {
        Long vehiculeId = createTestVehicule();

        Map<String, Object> corrective = Map.of(
                "vehiculeId", vehiculeId,
                "typeInterventionId", 1,
                "categorie", "corrective",
                "dateDebut", "2026-05-01T08:00:00Z",
                "coutPieces", 100.00,
                "coutMainOeuvre", 50.00,
                "coutSousTraitance", 0.00
        );

        Map<String, Object> preventive = Map.of(
                "vehiculeId", vehiculeId,
                "typeInterventionId", 1,
                "categorie", "preventive",
                "dateDebut", "2026-05-02T08:00:00Z",
                "coutPieces", 200.00,
                "coutMainOeuvre", 80.00,
                "coutSousTraitance", 0.00
        );

        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1").body(corrective)
                .when().post("/interventions").then().statusCode(201);
        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1").body(preventive)
                .when().post("/interventions").then().statusCode(201);

        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("categorie", "corrective")
        .when()
                .get("/interventions")
        .then()
                .statusCode(200)
                .body("content.categorie", everyItem(equalTo("corrective")));
    }

    @Test
    void search_composant_returns_max20() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("q", "moteur")
        .when()
                .get("/composants/search")
        .then()
                .statusCode(200)
                .body("size()", lessThanOrEqualTo(20));
    }

    private Long createTestVehicule() {
        Map<String, Object> camionDetails = Map.of("capaciteTonnes", 20.0, "configAxle", "4x2");
        Map<String, Object> body = Map.of(
                "code", "CI-" + (System.currentTimeMillis() % 10000000L),
                "nChassis", "NCH-" + System.nanoTime(),
                "type", "camion",
                "marque", "IVECO",
                "modele", "Stralis",
                "statut", "in-service",
                "camionDetails", camionDetails
        );

        return ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(201)
                .extract()
                .path("id")).longValue();
    }
}