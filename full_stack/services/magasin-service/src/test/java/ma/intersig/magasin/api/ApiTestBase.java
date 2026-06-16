package ma.intersig.magasin.api;

import io.restassured.RestAssured;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import static io.restassured.RestAssured.given;

/**
 * Shared Testcontainers setup (singleton container — one Postgres for the
 * whole test JVM). Each test starts from clean magasin tables with the
 * V202-seeded citerne reset to a known configuration.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class ApiTestBase {

    // pgvector image: the shared V1–V11 migrations create the vector extension
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("pgvector/pgvector:pg17").withDatabaseName("fleettracker_test");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.baseline-on-migrate", () -> "true");
        registry.add("spring.flyway.table", () -> "flyway_schema_history_magasin");
        registry.add("spring.flyway.locations", () -> "classpath:db/migrations-shared,classpath:db/migrations");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @LocalServerPort
    int port;

    @Autowired
    protected JdbcTemplate jdbc;

    @BeforeEach
    void baseSetUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/v1/magasin";
        jdbc.update("DELETE FROM jaugeage");
        jdbc.update("DELETE FROM sortie_carburant");
        jdbc.update("DELETE FROM arrivage");
        jdbc.update("DELETE FROM bareme_jaugeage");
        jdbc.update("""
                UPDATE citerne SET capacite_litres = 20000, densite_kg_par_litre = 0.845,
                       hauteur_max_cm = 200, stock_initial_litres = 0,
                       stock_initial_date = DATE '2025-01-01', actif = true
                """);
    }

    protected RequestSpecification asRole(String role) {
        return given()
                .header("X-Authenticated-User-Id", "1")
                .header("X-Authenticated-User-Roles", role);
    }

    protected Long insertVehicule(String code, String type, int compteurKm) {
        return jdbc.queryForObject("""
                INSERT INTO vehicules (code, type, marque, compteur_km)
                VALUES (?, ?, 'VOLVO', ?)
                ON CONFLICT (code) DO UPDATE SET compteur_km = EXCLUDED.compteur_km
                RETURNING id
                """, Long.class, code, type, compteurKm);
    }
}
