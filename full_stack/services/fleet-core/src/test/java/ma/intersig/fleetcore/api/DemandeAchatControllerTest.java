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
class DemandeAchatControllerTest {

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
    void create_da_auto_code_format() {
        Map<String, Object> body = Map.of(
                "pieceLibre", "Filtre à huile",
                "quantite", 2,
                "motif", "Remplacement filtre usé",
                "urgence", "Haute"
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/demandes-achat")
        .then()
                .statusCode(201)
                .body("code", matchesPattern("DA-\\d{4}-\\d{4}"))
                .body("statut", equalTo("Nouvelle"))
                .body("pieceLibre", equalTo("Filtre à huile"));
    }

    @Test
    void approve_from_nouvelle_succeeds() {
        Map<String, Object> createBody = Map.of(
                "pieceLibre", "Roulement SKF",
                "quantite", 1,
                "motif", "Usure normale",
                "urgence", "Moyenne"
        );

        long id = ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(createBody)
        .when()
                .post("/demandes-achat")
        .then()
                .statusCode(201)
                .extract()
                .path("id")).longValue();

        given()
                .header("X-Authenticated-User-Id", "2")
        .when()
                .patch("/demandes-achat/" + id + "/approuver")
        .then()
                .statusCode(200)
                .body("statut", equalTo("Approuvée"))
                .body("approbateur.id", equalTo(2));
    }

    @Test
    void reject_from_nouvelle_succeeds() {
        Map<String, Object> createBody = Map.of(
                "pieceLibre", "Joint spy",
                "quantite", 3,
                "motif", "Fuite détectée",
                "urgence", "Basse"
        );

        long id = ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(createBody)
        .when()
                .post("/demandes-achat")
        .then()
                .statusCode(201)
                .extract()
                .path("id")).longValue();

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "2")
                .body(Map.of("raison", "Hors budget trimestriel"))
        .when()
                .patch("/demandes-achat/" + id + "/rejeter")
        .then()
                .statusCode(200)
                .body("statut", equalTo("Rejetée"))
                .body("raisonRejet", equalTo("Hors budget trimestriel"));
    }

    @Test
    void close_from_approved_succeeds() {
        Map<String, Object> createBody = Map.of(
                "pieceLibre", "Plaquette frein",
                "quantite", 4,
                "motif", "Usure plaquettes",
                "urgence", "Haute"
        );

        long id = ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(createBody)
        .when()
                .post("/demandes-achat")
        .then()
                .statusCode(201)
                .extract()
                .path("id")).longValue();

        given()
                .header("X-Authenticated-User-Id", "2")
        .when()
                .patch("/demandes-achat/" + id + "/approuver")
        .then()
                .statusCode(200);

        given()
                .header("X-Authenticated-User-Id", "2")
        .when()
                .patch("/demandes-achat/" + id + "/cloturer")
        .then()
                .statusCode(200)
                .body("statut", equalTo("Clôturée"));
    }

    @Test
    void close_from_rejected_returns422() {
        Map<String, Object> createBody = Map.of(
                "pieceLibre", "Durit refroidissement",
                "quantite", 1,
                "motif", "Fuite durit",
                "urgence", "Haute"
        );

        long id = ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(createBody)
        .when()
                .post("/demandes-achat")
        .then()
                .statusCode(201)
                .extract()
                .path("id")).longValue();

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "2")
                .body(Map.of("raison", "Trop cher"))
        .when()
                .patch("/demandes-achat/" + id + "/rejeter")
        .then()
                .statusCode(200);

        given()
                .header("X-Authenticated-User-Id", "2")
        .when()
                .patch("/demandes-achat/" + id + "/cloturer")
        .then()
                .statusCode(422)
                .body("code", equalTo("INVALID_TRANSITION"));
    }

    @Test
    void approve_already_approved_returns422() {
        Map<String, Object> createBody = Map.of(
                "pieceLibre", "Ampoule phare",
                "quantite", 2,
                "motif", "Éclairage défaillant",
                "urgence", "Moyenne"
        );

        long id = ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(createBody)
        .when()
                .post("/demandes-achat")
        .then()
                .statusCode(201)
                .extract()
                .path("id")).longValue();

        given()
                .header("X-Authenticated-User-Id", "2")
        .when()
                .patch("/demandes-achat/" + id + "/approuver")
        .then()
                .statusCode(200);

        given()
                .header("X-Authenticated-User-Id", "2")
        .when()
                .patch("/demandes-achat/" + id + "/approuver")
        .then()
                .statusCode(422)
                .body("code", equalTo("INVALID_TRANSITION"));
    }
}