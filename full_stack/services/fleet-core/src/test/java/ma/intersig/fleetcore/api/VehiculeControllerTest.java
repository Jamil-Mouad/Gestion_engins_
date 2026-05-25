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
class VehiculeControllerTest {

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
    void createCamion_returns201_with_camionDetails() {
        Map<String, Object> camionDetails = Map.of(
                "capaciteTonnes", 26.0,
                "configAxle", "6x4"
        );
        Map<String, Object> body = Map.of(
                "code", "CAM-TEST-001",
                "type", "camion",
                "marque", "IVECO",
                "modele", "Stralis",
                "statut", "in-service",
                "chauffeurPrenom", "Ahmed",
                "chauffeurNom", "Benali",
                "camionDetails", camionDetails
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(201)
                .body("code", equalTo("CAM-TEST-001"))
                .body("type", equalTo("camion"))
                .body("camionDetails.capaciteTonnes", is(26.0f))
                .body("camionDetails.configAxle", equalTo("6x4"));
    }

    @Test
    void createChariot_returns201_without_camionDetails() {
        Map<String, Object> body = Map.of(
                "code", "CHR-TEST-001",
                "type", "chariot",
                "marque", "Toyota",
                "modele", "8FBN18",
                "statut", "in-service"
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(201)
                .body("code", equalTo("CHR-TEST-001"))
                .body("type", equalTo("chariot"))
                .body("camionDetails", nullValue());
    }

    @Test
    void createVehicule_duplicateCode_returns409() {
        Map<String, Object> body = Map.of(
                "code", "CAM-DUP-001",
                "type", "camion",
                "marque", "IVECO",
                "modele", "Stralis",
                "statut", "in-service",
                "camionDetails", Map.of("capaciteTonnes", 20.0, "configAxle", "4x2")
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(201);

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(409);
    }

    @Test
    void softDelete_returns204_historyPreserved() {
        Map<String, Object> body = Map.of(
                "code", "CAM-DEL-001",
                "type", "camion",
                "marque", "MAN",
                "modele", "TGX",
                "statut", "in-service",
                "camionDetails", Map.of("capaciteTonnes", 30.0, "configAxle", "6x4")
        );

        long id = ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(201)
                .extract()
                .path("id")).longValue();

        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .delete("/vehicules/" + id)
        .then()
                .statusCode(204);

        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/vehicules/" + id)
        .then()
                .statusCode(200)
                .body("actif", equalTo(false));
    }

    @Test
    void search_by_q_returns_matching() {
        Map<String, Object> body = Map.of(
                "code", "CAM-SEARCH-001",
                "type", "camion",
                "marque", "Mercedes",
                "modele", "Actros",
                "statut", "in-service",
                "camionDetails", Map.of("capaciteTonnes", 25.0, "configAxle", "4x2")
        );

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(body)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(201);

        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("q", "Mercedes")
        .when()
                .get("/vehicules")
        .then()
                .statusCode(200)
                .body("content", hasSize(greaterThanOrEqualTo(1)));
    }

    @Test
    void list_filterByType_camion_returns_only_camions() {
        Map<String, Object> camionDetails = Map.of("capaciteTonnes", 20.0, "configAxle", "4x2");
        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1")
                .body(Map.of("code","CAM-FILT-001","type","camion","marque","TestBrand","modele","M1","statut","in-service","camionDetails",camionDetails))
                .when().post("/vehicules").then().statusCode(201);
        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1")
                .body(Map.of("code","VCL-FILT-001","type","voiture","marque","Renault","modele","Clio","statut","in-service"))
                .when().post("/vehicules").then().statusCode(201);

        given().header("X-Authenticated-User-Id","1").queryParam("type","camion")
                .when().get("/vehicules")
                .then().statusCode(200)
                .body("content.findAll { it.type == 'camion' }.size()", greaterThanOrEqualTo(1))
                .body("content.findAll { it.type != 'camion' }.size()", equalTo(0));
    }

    @Test
    void list_filterByType_camionTracteur_returns_only_tracteurs() {
        Map<String, Object> camionDetails = Map.of("capaciteTonnes", 25.0, "configAxle", "6x4");
        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1")
                .body(Map.of("code","TRC-FILT-001","type","camion_tracteur","marque","VOLVO","modele","FH","statut","in-service","camionDetails",camionDetails))
                .when().post("/vehicules").then().statusCode(201);
        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1")
                .body(Map.of("code","CAM-FILT-002","type","camion","marque","Isuzu","modele","NLR","statut","in-service",
                        "camionDetails",Map.of("capaciteTonnes",8.0,"configAxle","4x2")))
                .when().post("/vehicules").then().statusCode(201);

        given().header("X-Authenticated-User-Id","1").queryParam("type","camion_tracteur")
                .when().get("/vehicules")
                .then().statusCode(200)
                .body("content.findAll { it.type == 'camion_tracteur' }.size()", greaterThanOrEqualTo(1))
                .body("content.findAll { it.type != 'camion_tracteur' }.size()", equalTo(0));
    }

    @Test
    void list_filterByStatut_returns_only_matching_statut() {
        Map<String, Object> camionDetails = Map.of("capaciteTonnes", 15.0, "configAxle", "4x2");
        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1")
                .body(Map.of("code","CAM-STA-001","type","camion","marque","Ford","modele","Cargo","statut","maintenance","camionDetails",camionDetails))
                .when().post("/vehicules").then().statusCode(201);

        given().header("X-Authenticated-User-Id","1").queryParam("statut","maintenance")
                .when().get("/vehicules")
                .then().statusCode(200)
                .body("content.findAll { it.statut == 'maintenance' }.size()", greaterThanOrEqualTo(1))
                .body("content.findAll { it.statut != 'maintenance' }.size()", equalTo(0));
    }

    @Test
    void list_searchByMatricule_returnsMatch() {
        Map<String, Object> camionDetails = Map.of("capaciteTonnes", 18.0, "configAxle", "4x2");
        given().contentType(ContentType.JSON).header("X-Authenticated-User-Id", "1")
                .body(Map.of("code","CAM-MAT-001","type","camion","marque","Scania","modele","R410",
                        "statut","in-service","matricule","55XYZ789","camionDetails",camionDetails))
                .when().post("/vehicules").then().statusCode(201);

        given().header("X-Authenticated-User-Id","1").queryParam("q","55XYZ")
                .when().get("/vehicules")
                .then().statusCode(200)
                .body("content", hasSize(greaterThanOrEqualTo(1)))
                .body("content[0].code", equalTo("CAM-MAT-001"));
    }

    @Test
    void request_without_gateway_header_returns401() {
        given()
                .contentType(ContentType.JSON)
        .when()
                .get("/vehicules")
        .then()
                .statusCode(401);
    }

    @Test
    void patchStatut_missing_statut_returns400() {
        Map<String, Object> createBody = Map.of(
                "code", "CAM-PATCH-001",
                "type", "camion",
                "marque", "Volvo",
                "modele", "FH",
                "statut", "in-service",
                "camionDetails", Map.of("capaciteTonnes", 22.0, "configAxle", "4x2")
        );

        long id = ((Number) given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(createBody)
        .when()
                .post("/vehicules")
        .then()
                .statusCode(201)
                .extract().path("id")).longValue();

        given()
                .contentType(ContentType.JSON)
                .header("X-Authenticated-User-Id", "1")
                .body(Map.of())
        .when()
                .patch("/vehicules/" + id + "/statut")
        .then()
                .statusCode(400);
    }
}