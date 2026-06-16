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
class PneuControllerTest {

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
    void assignPneu_returns201_kmParcourus0() {
        Long vehiculeId = createTestVehicule();

        Map<String, Object> body = Map.of(
                "position", 1,
                "nSerie", "SN-TEST-001",
                "reference", "REF-MICH-001",
                "marque", "Michelin",
                "dateMontage", "2026-05-06",
                "expectedLifeKm", 60000,
                "pressionPsi", 110.0,
                "profondeur32e", 32
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules/" + vehiculeId + "/pneus")
        .then()
                .statusCode(201)
                .body("kmParcourus", equalTo(0))
                .body("position", equalTo(1))
                .body("reference", equalTo("REF-MICH-001"))
                .body("status", notNullValue());
    }

    @Test
    void assignPneu_duplicateNSerie_returns409() {
        Long vehiculeId = createTestVehicule();
        String serial = "SN-DUP-" + System.currentTimeMillis();

        Map<String, Object> body = Map.of(
                "position", 1,
                "nSerie", serial,
                "reference", "REF-DUP",
                "marque", "Michelin",
                "expectedLifeKm", 60000
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules/" + vehiculeId + "/pneus")
        .then()
                .statusCode(201);

        Map<String, Object> dup = Map.of(
                "position", 2,
                "nSerie", serial,
                "reference", "REF-DUP-2",
                "marque", "Michelin",
                "expectedLifeKm", 60000
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(dup)
        .when()
                .post("/vehicules/" + vehiculeId + "/pneus")
        .then()
                .statusCode(409)
                .body("code", equalTo("N_SERIE_ALREADY_EXISTS"));
    }

    @Test
    void assignPneu_missingNSerieOrReference_returns400() {
        Long vehiculeId = createTestVehicule();

        Map<String, Object> body = Map.of(
                "position", 1,
                "marque", "Michelin",
                "expectedLifeKm", 60000
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules/" + vehiculeId + "/pneus")
        .then()
                .statusCode(400);
    }

    @Test
    void fichePdf_returns200_withPdfContentType() {
        Long vehiculeId = createTestVehicule();
        Long pneuId = assignPneu(vehiculeId, 1);

        byte[] pdf = given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/pneus/" + pneuId + "/fiche.pdf")
        .then()
                .statusCode(200)
                .contentType("application/pdf")
                .header("Content-Disposition", containsString("fiche-pneu-" + pneuId))
                .extract().asByteArray();

        // %PDF magic bytes
        org.assertj.core.api.Assertions.assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    void rotatePneu_swapsPositions_creates2InspectionRows() {
        Long vehiculeId = createTestVehicule();
        Long pneu1Id = assignPneu(vehiculeId, 1);
        Long pneu2Id = assignPneu(vehiculeId, 2);

        Map<String, Object> body = Map.of("nouvellePosition", 2);

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .patch("/pneus/" + pneu1Id + "/permuter")
        .then()
                .statusCode(200)
                .body("pneu1.position", equalTo(2))
                .body("pneu2.position", equalTo(1));

        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/pneus/" + pneu1Id + "/inspections")
        .then()
                .statusCode(200)
                .body("totalElements", greaterThanOrEqualTo(1));

        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/pneus/" + pneu2Id + "/inspections")
        .then()
                .statusCode(200)
                .body("totalElements", greaterThanOrEqualTo(1));
    }

    @Test
    void rotatePneu_crossVehicle_returns422() {
        Long vehic1 = createTestVehicule();
        Long vehic2 = createTestVehicule();
        Long pneu1Id = assignPneu(vehic1, 1);
        assignPneu(vehic2, 2);

        Map<String, Object> body = Map.of("nouvellePosition", 2);

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .patch("/pneus/" + pneu1Id + "/permuter")
        .then()
                .statusCode(422);
    }

    @Test
    void replacePneu_oldInactive_newKmMontageIsVehiculeKm() {
        Long vehiculeId = createTestVehicule();
        Long pneuId = assignPneu(vehiculeId, 1);

        Map<String, Object> replaceBody = Map.of(
                "nSerie", "SN-NEW-001",
                "reference", "REF-BRID-001",
                "marque", "Bridgestone",
                "dateMontage", "2026-05-06",
                "expectedLifeKm", 80000,
                "pressionPsi", 115.0,
                "profondeur32e", 32
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(replaceBody)
        .when()
                .patch("/pneus/" + pneuId + "/remplacer")
        .then()
                .statusCode(200)
                .body("kmParcourus", equalTo(0))
                .body("actif", equalTo(true));
    }

    private Long createTestVehicule() {
        Map<String, Object> body = Map.of(
                "code", "CP-" + (System.currentTimeMillis() % 10000000L),
                "nChassis", "NCH-" + System.nanoTime(),
                "type", "camion",
                "marque", "MAN",
                "modele", "TGX",
                "statut", "in-service",
                "camionDetails", Map.of("capaciteTonnes", 26.0, "configAxle", "6x4")
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

    private Long assignPneu(Long vehiculeId, int position) {
        Map<String, Object> body = Map.of(
                "position", position,
                "nSerie", "SN-POS-" + position + "-" + System.nanoTime(),
                "reference", "REF-POS-" + position,
                "marque", "Michelin",
                "dateMontage", "2026-05-06",
                "expectedLifeKm", 60000,
                "pressionPsi", 110.0,
                "profondeur32e", 32
        );

        return ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules/" + vehiculeId + "/pneus")
        .then()
                .statusCode(201)
                .extract()
                .path("id")).longValue();
    }
}