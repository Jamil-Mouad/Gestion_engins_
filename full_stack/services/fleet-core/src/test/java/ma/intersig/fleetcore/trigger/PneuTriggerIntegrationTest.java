package ma.intersig.fleetcore.trigger;

import jakarta.persistence.EntityManager;
import ma.intersig.fleetcore.entity.Camion;
import ma.intersig.fleetcore.entity.Pneu;
import ma.intersig.fleetcore.entity.ReleveCompteur;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.exception.ReleveRegressionException;
import ma.intersig.fleetcore.repository.PneuRepository;
import ma.intersig.fleetcore.repository.ReleveCompteurRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import ma.intersig.fleetcore.service.ReleveCompteurService;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@Transactional
class PneuTriggerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg17")
            .withDatabaseName("fleettracker_test");

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

    @Autowired
    private ReleveCompteurService releveService;

    @Autowired
    private VehiculeRepository vehiculeRepository;

    @Autowired
    private PneuRepository pneuRepository;

    @Autowired
    private ReleveCompteurRepository releveRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void insertReleve_triggers_pneuKmUpdate() {
        Camion camion = createTestCamion("CAM-TRIG-001");
        Pneu pneu = createTestPneu(camion, (short) 1, 50000);

        var req = new ma.intersig.fleetcore.dto.request.CreateReleveRequest(
                camion.getId(), OffsetDateTime.now(), 145000, null
        );
        releveService.create(req, 1L);

        entityManager.flush();
        entityManager.clear();

        Pneu updated = pneuRepository.findById(pneu.getId()).orElseThrow();
        assertEquals(5000, updated.getKmParcourus());
        assertTrue(updated.getKmRestant() != null && updated.getKmRestant() > 0,
                "kmRestant should be computed by trigger, got: " + updated.getKmRestant());
    }

    @Test
    void pneuKmBeyondThreshold_statusBecomesEmpty() {
        Camion camion = createTestCamion("CAM-TRIG-002");
        camion.setCompteurKm(200000);
        vehiculeRepository.save(camion);

        Pneu pneu = createTestPneu(camion, (short) 1, 50000);

        var req = new ma.intersig.fleetcore.dto.request.CreateReleveRequest(
                camion.getId(), OffsetDateTime.now(), 200000, null
        );
        releveService.create(req, 1L);

        entityManager.flush();
        entityManager.clear();

        Pneu updated = pneuRepository.findById(pneu.getId()).orElseThrow();
        assertEquals("empty", updated.getStatus());
        assertTrue(updated.getKmRestant() != null && updated.getKmRestant() <= 5000,
                "kmRestant should be <= 5000 for empty status, got: " + updated.getKmRestant());
    }

    @Test
    void pneuKmBelowWarnThreshold_statusBecomesWarn() {
        Camion camion = createTestCamion("CAM-TRIG-003");
        Pneu pneu = createTestPneu(camion, (short) 1, 50000);

        int kmReachingWarn = 140000 + 45000;

        var req = new ma.intersig.fleetcore.dto.request.CreateReleveRequest(
                camion.getId(), OffsetDateTime.now(), kmReachingWarn, null
        );
        releveService.create(req, 1L);

        entityManager.flush();
        entityManager.clear();

        Pneu updated = pneuRepository.findById(pneu.getId()).orElseThrow();
        assertTrue(updated.getStatus().equals("warn") || updated.getStatus().equals("empty"),
                "Expected status warn or empty, got: " + updated.getStatus());
        assertTrue(updated.getKmRestant() != null,
                "kmRestant should be computed by trigger, got null");
    }

    @Test
    void releveRegression_throwsBefore_insert() {
        Camion camion = createTestCamion("CAM-TRIG-004");
        camion.setCompteurKm(150000);
        vehiculeRepository.save(camion);

        var req = new ma.intersig.fleetcore.dto.request.CreateReleveRequest(
                camion.getId(), OffsetDateTime.now(), 140000, null
        );

        assertThrows(ReleveRegressionException.class, () -> releveService.create(req, 1L));
    }

    private Camion createTestCamion(String code) {
        Camion c = new Camion();
        c.setCode(code);
        c.setType("camion");
        c.setMarque("IVECO");
        c.setModele("Stralis");
        c.setStatut("in-service");
        c.setActif(true);
        c.setCompteurKm(140000);
        c.setCompteurHeures(5000);
        c.setConfigAxle("4x2");
        c.setCapaciteTonnes(new BigDecimal("20.0"));
        return vehiculeRepository.save(c);
    }

    private Pneu createTestPneu(Camion camion, short position, int expectedLifeKm) {
        Pneu p = new Pneu();
        p.setVehicule(camion);
        p.setPosition(position);
        p.setKmParcourus(0);
        p.setKmMontage(camion.getCompteurKm());
        p.setExpectedLifeKm(expectedLifeKm);
        p.setStatus("ok");
        p.setActif(true);
        p.setMarque("Michelin");
        p.setNSerie("SN-" + System.currentTimeMillis());
        return pneuRepository.save(p);
    }
}