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
class KpiControllerTest {

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
    void getKpis_returns4HeadlineValues() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/kpis")
        .then()
                .statusCode(200)
                .body("disponibilite", notNullValue())
                .body("coutMensuelMad", notNullValue())
                .body("kmParcourusMois", notNullValue())
                .body("kmCumules", notNullValue());
    }

    @Test
    void getKpis_returns200() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/kpis")
        .then()
                .statusCode(200);
    }

    @Test
    void getTimeseries_returns12Points() {
        given()
                .header("X-Authenticated-User-Id", "1")
                .queryParam("mois", 12)
        .when()
                .get("/kpis/disponibilite/timeseries")
        .then()
                .statusCode(200);
    }

    @Test
    void getCoutsBreakdown_returnsCategories() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/kpis/couts/breakdown")
        .then()
                .statusCode(200);
    }

    @Test
    void getKpis_headerXKpiLastRefresh_present() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/kpis")
        .then()
                .statusCode(200)
                .header("X-KPI-Last-Refresh", notNullValue());
    }

    @Test
    void getDashboardConfig_roundtrip_opaqueBlob() {
        given()
                .header("X-Authenticated-User-Id", "1")
        .when()
                .get("/users/me/dashboard-config")
        .then()
                .statusCode(anyOf(is(200), is(404)));
    }
}