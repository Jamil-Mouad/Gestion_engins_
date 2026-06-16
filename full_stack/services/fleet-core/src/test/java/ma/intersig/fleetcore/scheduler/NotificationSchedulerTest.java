package ma.intersig.fleetcore.scheduler;

import ma.intersig.fleetcore.entity.*;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.repository.*;
import ma.intersig.fleetcore.service.NotificationService;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class NotificationSchedulerTest {

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
        registry.add("spring.flyway.locations", () -> "classpath:db/migrations-shared,classpath:db/migrations");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.mail.host", () -> "localhost");
        registry.add("spring.mail.port", () -> "1025");
    }

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VehiculeRepository vehiculeRepository;

    @Autowired
    private PneuRepository pneuRepository;

    @Autowired
    private NotificationScheduler notificationScheduler;

    @Test
    void scheduler_createsNotification_for_warnPneu() {
        // Seed a vehicule + pneu in warn status; V3 provides at least one actif=true user.
        Vehicule vehicule = new Vehicule();
        vehicule.setCode("TW-" + (System.nanoTime() % 10000000L));
        vehicule.setType("chariot");
        vehicule.setMarque("TestMarque");
        vehicule.setModele("TestModele");
        vehicule.setStatut("in-service");
        vehicule = vehiculeRepository.save(vehicule);

        Pneu pneu = new Pneu();
        pneu.setVehicule(vehicule);
        pneu.setPosition((short) 1);
        pneu.setKmParcourus(0);
        pneu.setExpectedLifeKm(50_000);
        pneu.setStatus("warn");
        pneuRepository.save(pneu);

        long countBefore = notificationRepository.count();
        notificationScheduler.runAlertScan();
        long countAfter = notificationRepository.count();

        assertTrue(countAfter > countBefore,
                "Scheduler must create at least one notification for a warn pneu when active users exist");
    }

    @Test
    void scheduler_is_idempotent_within24h() {
        notificationScheduler.runAlertScan();
        long countAfterFirst = notificationRepository.count();
        notificationScheduler.runAlertScan();
        long countAfterSecond = notificationRepository.count();
        assertEquals(countAfterFirst, countAfterSecond, "Second scan within 24h should not create duplicates");
    }

    @Test
    void scheduler_doesNotRecreate_afterUserMarksAsRead() {
        Vehicule vehicule = new Vehicule();
        vehicule.setCode("MR-" + (System.nanoTime() % 10000000L));
        vehicule.setType("chariot");
        vehicule.setMarque("TestMarque");
        vehicule.setModele("TestModele");
        vehicule.setStatut("in-service");
        vehicule = vehiculeRepository.save(vehicule);

        Pneu pneu = new Pneu();
        pneu.setVehicule(vehicule);
        pneu.setPosition((short) 2);
        pneu.setKmParcourus(0);
        pneu.setExpectedLifeKm(50_000);
        pneu.setStatus("warn");
        pneuRepository.save(pneu);

        notificationScheduler.runAlertScan();
        long countAfterFirst = notificationRepository.count();

        // Simulate the user clicking "mark as read" — this was the dedup bypass that caused the flood
        User owner = userRepository.findById(1L).orElseThrow();
        notificationRepository.findByUserIdAndLu(owner.getId(), false, PageRequest.of(0, 100))
                .forEach(n -> notificationService.marquerLue(n.getId(), owner.getId()));

        notificationScheduler.runAlertScan();
        long countAfterSecond = notificationRepository.count();

        assertEquals(countAfterFirst, countAfterSecond,
                "Scheduler must not recreate notifications for an issue already notified within 24h, even if the user marked them as read");
    }

    @Test
    void scheduler_smtpFailure_persistsRow_emailEnvoyeFalse() {
        // Seed a notification row with emailEnvoye=false directly (as the scheduler would
        // after a MailException), then confirm runAlertScan() does not throw and the row
        // persists with emailEnvoye=false. The test mail server (localhost:1025) is not
        // running, so any real send attempt by the scheduler also produces emailEnvoye=false.
        User owner = userRepository.findById(1L)
                .orElseThrow(() -> new IllegalStateException("V3 seed user not found"));

        Notification notif = new Notification();
        notif.setUser(owner);
        notif.setSeverite("critical");
        notif.setCategorie("seuil_pneu");
        notif.setTitre("Pneu test");
        notif.setDetail("test detail");
        notif.setLu(false);
        notif.setEmailEnvoye(false);
        Notification saved = notificationRepository.save(notif);

        assertDoesNotThrow(() -> notificationScheduler.runAlertScan());

        Notification persisted = notificationRepository.findById(saved.getId())
                .orElseThrow(() -> new AssertionError("Notification row not found after scheduler run"));
        assertFalse(persisted.getEmailEnvoye(), "Row must persist with emailEnvoye=false when SMTP fails");
    }

    @Test
    void marquerLue_sets_luTrue_for_owner() {
        User owner = userRepository.findById(1L)
                .orElseThrow(() -> new IllegalStateException("V3 seed user not found"));

        Notification notif = new Notification();
        notif.setUser(owner);
        notif.setSeverite("info");
        notif.setCategorie("vidange_depasse");
        notif.setTitre("Vidange test");
        notif.setDetail("detail");
        notif.setLu(false);
        notif.setEmailEnvoye(false);
        Notification saved = notificationRepository.save(notif);

        notificationService.marquerLue(saved.getId(), owner.getId());

        Notification updated = notificationRepository.findById(saved.getId())
                .orElseThrow();
        assertTrue(updated.getLu(), "marquerLue must set lu=true for the owning user");
    }

    @Test
    void marquerLue_returns403_for_other_user() {
        User owner = userRepository.findById(1L)
                .orElseThrow(() -> new IllegalStateException("V3 seed user not found"));

        Notification notif = new Notification();
        notif.setUser(owner);
        notif.setSeverite("info");
        notif.setCategorie("vidange_depasse");
        notif.setTitre("Cross-user test");
        notif.setDetail("detail");
        notif.setLu(false);
        notif.setEmailEnvoye(false);
        Notification saved = notificationRepository.save(notif);

        long wrongUserId = 9999L;
        BusinessException ex = assertThrows(BusinessException.class,
                () -> notificationService.marquerLue(saved.getId(), wrongUserId));
        assertEquals(403, ex.getHttpStatus());

        Notification unchanged = notificationRepository.findById(saved.getId()).orElseThrow();
        assertFalse(unchanged.getLu(), "lu must stay false after a rejected marquerLue call");
    }
}