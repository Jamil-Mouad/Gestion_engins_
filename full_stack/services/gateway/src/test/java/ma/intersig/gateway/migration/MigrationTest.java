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
import java.sql.ResultSet;
import java.sql.Statement;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MigrationTest {

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
    void migrationsApplyCleanly() throws Exception {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name != 'flyway_schema_history'");
            try (ResultSet rs = stmt.getResultSet()) {
                rs.next();
                int tableCount = rs.getInt(1);
                assertThat("Expected 15 tables (14 domain + ai_embeddings)", tableCount, equalTo(15));
            }
        }
    }

    @Test
    void flywaySchemaHistoryHas9Versions() throws Exception {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("SELECT count(*) FROM flyway_schema_history WHERE success=true");
            try (ResultSet rs = stmt.getResultSet()) {
                rs.next();
                int versionCount = rs.getInt(1);
                assertThat("Expected 9 successful migrations (V1-V9)", versionCount, equalTo(9));
            }
        }
    }
}
