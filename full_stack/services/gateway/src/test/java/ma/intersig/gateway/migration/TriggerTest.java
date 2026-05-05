package ma.intersig.gateway.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class TriggerTest {

    @Autowired
    Flyway flyway;

    @Autowired
    DataSource dataSource;

    @BeforeAll
    void setUp() {
        flyway.clean();
        flyway.migrate();
    }

    @Test
    void triggerReleve_incrementsPneuKmParcourus() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            String testUuid = UUID.randomUUID().toString().substring(0, 8);
            String testVehiculeCode = "TEST-" + testUuid;
            String testMatricule = "TEST-MAT-" + testUuid;

            int vehiculeId;
            try (PreparedStatement pstmt = conn.prepareStatement("""
                INSERT INTO vehicules (code, type, marque, modele, matricule, statut, compteur_km, compteur_heures, actif, created_at, updated_at)
                VALUES (?, 'camion', 'TEST', '', ?, 'in-service', 0, 0, true, NOW(), NOW())
                RETURNING id
                """)) {
                pstmt.setString(1, testVehiculeCode);
                pstmt.setString(2, testMatricule);
                pstmt.execute();
                try (ResultSet rs = pstmt.getResultSet()) {
                    if (!rs.next()) {
                        throw new AssertionError("Expected pneus row to exist");
                    }
                    vehiculeId = rs.getInt(1);
                }
            }

            int pneuId;
            try (PreparedStatement pstmt = conn.prepareStatement("""
                INSERT INTO pneus (vehicule_id, position, status, km_parcourus, expected_life_km, created_at, updated_at)
                VALUES (?, 1, 'ok', 0, 50000, NOW(), NOW())
                RETURNING id
                """)) {
                pstmt.setInt(1, vehiculeId);
                pstmt.execute();
                try (ResultSet rs = pstmt.getResultSet()) {
                    if (!rs.next()) {
                        throw new AssertionError("Expected pneus row to exist");
                    }
                    pneuId = rs.getInt(1);
                }
            }

            try (PreparedStatement pstmt = conn.prepareStatement("""
                INSERT INTO releves_compteur (vehicule_id, compteur_km, source, date_releve, created_by)
                VALUES (?, 1000, 'excel_import', NOW(), 1)
                """)) {
                pstmt.setInt(1, vehiculeId);
                pstmt.execute();
            }

            try (PreparedStatement pstmt = conn.prepareStatement("SELECT km_parcourus FROM pneus WHERE id = ?")) {
                pstmt.setInt(1, pneuId);
                try (ResultSet rs = pstmt.executeQuery()) {
                    if (!rs.next()) {
                        throw new AssertionError("Expected pneus row to exist");
                    }
                    int kmParcourus = rs.getInt(1);
                    assertThat("Trigger should set pneus.km_parcourus to 1000", kmParcourus, equalTo(1000));
                }
            }
        }
    }

    @Test
    void triggerPneuStatus_setsWarnWhenCloseToLimit() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            String testUuid = UUID.randomUUID().toString().substring(0, 8);
            String testVehiculeCode = "TEST-" + testUuid;
            String testMatricule = "TEST-MAT-" + testUuid;

            int vehiculeId;
            try (PreparedStatement pstmt = conn.prepareStatement("""
                INSERT INTO vehicules (code, type, marque, modele, matricule, statut, compteur_km, compteur_heures, actif, created_at, updated_at)
                VALUES (?, 'camion', 'TEST', '', ?, 'in-service', 0, 0, true, NOW(), NOW())
                RETURNING id
                """)) {
                pstmt.setString(1, testVehiculeCode);
                pstmt.setString(2, testMatricule);
                pstmt.execute();
                try (ResultSet rs = pstmt.getResultSet()) {
                    if (!rs.next()) {
                        throw new AssertionError("Expected pneus row to exist");
                    }
                    vehiculeId = rs.getInt(1);
                }
            }

            int pneuId;
            try (PreparedStatement pstmt = conn.prepareStatement("""
                INSERT INTO pneus (vehicule_id, position, status, km_parcourus, expected_life_km, created_at, updated_at)
                VALUES (?, 1, 'ok', 0, 5000, NOW(), NOW())
                RETURNING id
                """)) {
                pstmt.setInt(1, vehiculeId);
                pstmt.execute();
                try (ResultSet rs = pstmt.getResultSet()) {
                    if (!rs.next()) {
                        throw new AssertionError("Expected pneus row to exist");
                    }
                    pneuId = rs.getInt(1);
                }
            }

            try (PreparedStatement pstmt = conn.prepareStatement("UPDATE pneus SET km_parcourus = 4500 WHERE id = ?")) {
                pstmt.setInt(1, pneuId);
                pstmt.execute();
            }

            try (PreparedStatement pstmt = conn.prepareStatement("SELECT status FROM pneus WHERE id = ?")) {
                pstmt.setInt(1, pneuId);
                try (ResultSet rs = pstmt.executeQuery()) {
                    if (!rs.next()) {
                        throw new AssertionError("Expected pneus row to exist");
                    }
                    String status = rs.getString(1);
                    assertThat("Trigger should set status to 'warn' when km_parcourus is close to limit", status, equalTo("warn"));
                }
            }
        }
    }
}