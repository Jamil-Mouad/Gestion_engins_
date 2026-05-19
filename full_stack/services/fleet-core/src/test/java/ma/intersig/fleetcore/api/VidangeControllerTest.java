package ma.intersig.fleetcore.api;

import io.restassured.RestAssured;
import ma.intersig.fleetcore.entity.SuiviVidange;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.repository.SuiviVidangeRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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
class VidangeControllerTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg17")
            .withDatabaseName("fleettracker_test");

    @LocalServerPort
    int port;

    @Autowired
    VehiculeRepository vehiculeRepository;

    @Autowired
    SuiviVidangeRepository suiviVidangeRepository;

    private Long seededVidangeId;

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

        Vehicule v = new Vehicule();
        v.setCode("VID-" + System.nanoTime() % 10_000_000L);
        v.setType("chariot");
        v.setMarque("TestM");
        v.setModele("TestMod");
        v.setStatut("in-service");
        v = vehiculeRepository.save(v);

        SuiviVidange sv = new SuiviVidange();
        sv.setVehicule(v);
        sv.setStatut("en_cours");
        sv.setIntervalleNbh(1_000);
        sv.setCompteurNbhActuel(0);
        sv = suiviVidangeRepository.save(sv);
        seededVidangeId = sv.getId();
    }

    @Test
    void getVidanges_filterByStatut_depasse() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("statut", "depasse")
        .when()
                .get("/vidanges")
        .then()
                .statusCode(200);
    }

    @Test
    void cloturer_seededVidange_returns200() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .patch("/vidanges/{id}/cloturer", seededVidangeId)
        .then()
                .statusCode(200);
    }

    @Test
    void cloturer_alreadyClosed_returns422() {
        given().header("X-Authenticated-User-Id", "1")
               .patch("/vidanges/{id}/cloturer", seededVidangeId);

        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .patch("/vidanges/{id}/cloturer", seededVidangeId)
        .then()
                .statusCode(422);
    }

    @Test
    void cloturer_nonExistent_returns404() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .patch("/vidanges/99999999/cloturer")
        .then()
                .statusCode(404);
    }

    @Test
    void getPlanningWeeks_returns4Buckets() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("semaines", 4)
        .when()
                .get("/vidanges/planning")
        .then()
                .statusCode(200)
                .body("size()", is(4));
    }
}
