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

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class AttelageControllerTest {

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

    // ── helpers ──────────────────────────────────────────────────────────────

    private long createCamion(String code) {
        Map<String, Object> camionDetails = new HashMap<>();
        camionDetails.put("configAxle", "6x4");
        camionDetails.put("compteurKm", 0);
        camionDetails.put("compteurHeures", 0);

        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("nChassis", "NCH-" + System.nanoTime());
        body.put("type", "camion");
        body.put("marque", "IVECO");
        body.put("modele", "Stralis");
        body.put("statut", "in-service");
        body.put("camionDetails", camionDetails);

        return ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(201)
                .extract().path("id")).longValue();
    }

    private long createSemi(String code) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("nChassis", "NCH-" + System.nanoTime());
        body.put("type", "semi_remorque");
        body.put("marque", "Schmitz");
        body.put("modele", "S.KO");
        body.put("statut", "in-service");

        return ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(201)
                .extract().path("id")).longValue();
    }

    private long createAttelage(long tracteurId, long semiId) {
        Map<String, Object> body = new HashMap<>();
        body.put("tracteurId", tracteurId);
        body.put("semiId", semiId);
        body.put("dateDebut", LocalDate.now().toString());

        return ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/attelages")
        .then()
                .statusCode(201)
                .extract().path("id")).longValue();
    }

    // ── tests ─────────────────────────────────────────────────────────────────

    @Test
    void createAttelage_returns201_andAppearsInVehiculeDetail() {
        long tracteurId = createCamion("CAM-T8-001");
        long semiId = createSemi("SR-T8-001");

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(Map.of(
                        "tracteurId", tracteurId,
                        "semiId", semiId,
                        "dateDebut", LocalDate.now().toString()))
        .when()
                .post("/attelages")
        .then()
                .statusCode(201)
                .body("tracteurCode", equalTo("CAM-T8-001"))
                .body("semiCode", equalTo("SR-T8-001"));

        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/vehicules/" + tracteurId)
        .then()
                .statusCode(200)
                .body("currentAttelage.semiCode", equalTo("SR-T8-001"));
    }

    @Test
    void createAttelage_withNonCamionAsSemi_returns422() {
        long camion1 = createCamion("CAM-T8-002");
        long camion2 = createCamion("CAM-T8-003");

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(Map.of(
                        "tracteurId", camion1,
                        "semiId", camion2,
                        "dateDebut", LocalDate.now().toString()))
        .when()
                .post("/attelages")
        .then()
                .statusCode(422);
    }

    @Test
    void createAttelage_whenTracteurAlreadyAssigned_returns422() {
        long tracteur = createCamion("CAM-T8-004");
        long semi1 = createSemi("SR-T8-002");
        long semi2 = createSemi("SR-T8-003");

        // First assignment succeeds
        createAttelage(tracteur, semi1);

        // Second assignment with same tracteur must fail
        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(Map.of(
                        "tracteurId", tracteur,
                        "semiId", semi2,
                        "dateDebut", LocalDate.now().toString()))
        .when()
                .post("/attelages")
        .then()
                .statusCode(422);
    }

    @Test
    void createAttelage_whenSemiAlreadyAssigned_returns422() {
        long tracteur1 = createCamion("CAM-T8-005");
        long tracteur2 = createCamion("CAM-T8-006");
        long semi = createSemi("SR-T8-004");

        // First assignment succeeds
        createAttelage(tracteur1, semi);

        // Second assignment with same semi must fail
        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(Map.of(
                        "tracteurId", tracteur2,
                        "semiId", semi,
                        "dateDebut", LocalDate.now().toString()))
        .when()
                .post("/attelages")
        .then()
                .statusCode(422);
    }

    @Test
    void terminateAttelage_setsDateFin_andClearsFromVehiculeDetail() {
        long tracteurId = createCamion("CAM-T8-007");
        long semiId = createSemi("SR-T8-005");
        long attelageId = createAttelage(tracteurId, semiId);

        // Terminate with today's date
        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(Map.of("dateFin", LocalDate.now().toString()))
        .when()
                .patch("/attelages/" + attelageId + "/terminer")
        .then()
                .statusCode(200)
                .body("dateFin", notNullValue());

        // currentAttelage should now be null on vehicule detail
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/vehicules/" + tracteurId)
        .then()
                .statusCode(200)
                .body("currentAttelage", nullValue());
    }

    @Test
    void listAttelages_byTracteur_returnsHistory() {
        long tracteurId = createCamion("CAM-T8-008");
        long semiId = createSemi("SR-T8-006");
        createAttelage(tracteurId, semiId);

        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("tracteurId", tracteurId)
        .when()
                .get("/attelages")
        .then()
                .statusCode(200)
                .body("", hasSize(1))
                .body("[0].semiCode", equalTo("SR-T8-006"));
    }
}
