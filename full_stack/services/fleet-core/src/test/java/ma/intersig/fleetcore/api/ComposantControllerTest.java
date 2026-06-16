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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class ComposantControllerTest {

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

    private long createVehicule() {
        Map<String, Object> body = Map.of(
                "code", "CC-" + (System.nanoTime() % 100000000L),
                "nChassis", "NCH-CC-" + System.nanoTime(),
                "type", "camion",
                "marque", "MAN",
                "modele", "TGX",
                "statut", "in-service",
                "camionDetails", Map.of("capaciteTonnes", 26.0, "configAxle", "6x4")
        );
        return ((Number) given().contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body).when().post("/vehicules")
                .then().statusCode(201).extract().path("id")).longValue();
    }

    @Test
    void newVehicle_getsItsOwnCopyOfTheTemplateTree() {
        long vehiculeId = createVehicule();

        List<Map<String, Object>> tree = given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("vehiculeId", vehiculeId)
        .when()
                .get("/composants/tree")
        .then()
                .statusCode(200)
                .extract().jsonPath().getList("$");

        // V113 seeds 7+ template roots (Moteur, Freinage, Châssis, …)
        org.assertj.core.api.Assertions.assertThat(tree.size()).isGreaterThanOrEqualTo(5);
        for (Map<String, Object> root : tree) {
            org.assertj.core.api.Assertions.assertThat(((Number) root.get("vehiculeId")).longValue())
                    .isEqualTo(vehiculeId);
        }
    }

    @Test
    void twoVehicles_haveIndependentTrees() {
        long v1 = createVehicule();
        long v2 = createVehicule();

        List<Long> ids1 = given().header("X-Authenticated-User-Id", "1")
                .queryParam("vehiculeId", v1).when().get("/composants/tree")
                .then().statusCode(200).extract().jsonPath().getList("id", Long.class);
        List<Long> ids2 = given().header("X-Authenticated-User-Id", "1")
                .queryParam("vehiculeId", v2).when().get("/composants/tree")
                .then().statusCode(200).extract().jsonPath().getList("id", Long.class);

        org.assertj.core.api.Assertions.assertThat(ids1).doesNotContainAnyElementsOf(ids2);
    }

    @Test
    void nestingDeeperThan3Levels_isAllowed() {
        long vehiculeId = createVehicule();

        // root (niveau 1) and three nested children → niveau 4
        long parentId = createComposant(null, vehiculeId, "Niveau 1 - " + System.nanoTime());
        for (int depth = 2; depth <= 4; depth++) {
            parentId = createComposant(parentId, null, "Niveau " + depth + " - " + System.nanoTime());
        }

        given().header("X-Authenticated-User-Id", "1")
        .when()
                .get("/composants/" + parentId)
        .then()
                .statusCode(200)
                .body("niveau", equalTo(4));
    }

    @Test
    void duplicateReferenceOnSameVehicle_returns409() {
        long vehiculeId = createVehicule();
        String ref = "REF-DUP-" + System.nanoTime();

        Map<String, Object> body = new HashMap<>();
        body.put("designation", "Comp A");
        body.put("reference", ref);
        body.put("categorie", "moteur");
        body.put("vehiculeId", vehiculeId);

        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1")
                .body(body).when().post("/composants").then().statusCode(201);

        body.put("designation", "Comp B");
        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1")
                .body(body).when().post("/composants").then()
                .statusCode(409)
                .body("code", equalTo("REFERENCE_ALREADY_EXISTS"));
    }

    @Test
    void deletingParent_cascadesToWholeSubtree() {
        long vehiculeId = createVehicule();
        long rootId = createComposant(null, vehiculeId, "Cascade root - " + System.nanoTime());
        long childId = createComposant(rootId, null, "Cascade child - " + System.nanoTime());
        long grandChildId = createComposant(childId, null, "Cascade grandchild - " + System.nanoTime());

        given().header("X-Authenticated-User-Id", "1")
                .when().delete("/composants/" + rootId)
                .then().statusCode(204);

        for (long id : new long[]{rootId, childId, grandChildId}) {
            given().header("X-Authenticated-User-Id", "1")
                    .when().get("/composants/" + id)
                    .then().statusCode(404);
        }
    }

    @Test
    void deletingSubtree_withInterventionOnDescendant_returns409() {
        long vehiculeId = createVehicule();
        long rootId = createComposant(null, vehiculeId, "Used root - " + System.nanoTime());
        long childId = createComposant(rootId, null, "Used child - " + System.nanoTime());

        Map<String, Object> intervention = Map.of(
                "vehiculeId", vehiculeId,
                "composantId", childId,
                "typeInterventionId", 1,
                "categorie", "corrective",
                "dateDebut", "2026-06-01T08:00:00Z",
                "coutPieces", 100.00,
                "coutMainOeuvre", 50.00,
                "coutSousTraitance", 0.00
        );
        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1")
                .body(intervention).when().post("/interventions")
                .then().statusCode(201);

        // the referenced child blocks deletion of the whole subtree
        given().header("X-Authenticated-User-Id", "1")
                .when().delete("/composants/" + rootId)
                .then().statusCode(409)
                .body("code", equalTo("COMPOSANT_IN_USE"));

        given().header("X-Authenticated-User-Id", "1")
                .when().get("/composants/" + childId)
                .then().statusCode(200);
    }

    private long createComposant(Long parentId, Long vehiculeId, String designation) {
        Map<String, Object> body = new HashMap<>();
        body.put("designation", designation);
        body.put("categorie", "moteur");
        if (parentId != null) body.put("parentId", parentId);
        if (vehiculeId != null) body.put("vehiculeId", vehiculeId);
        return ((Number) given().contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body).when().post("/composants")
                .then().statusCode(201).extract().path("id")).longValue();
    }
}
