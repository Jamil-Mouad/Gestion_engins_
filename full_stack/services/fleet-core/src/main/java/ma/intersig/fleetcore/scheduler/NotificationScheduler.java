package ma.intersig.fleetcore.scheduler;

import ma.intersig.fleetcore.entity.Camion;
import ma.intersig.fleetcore.entity.Notification;
import ma.intersig.fleetcore.entity.SuiviVidange;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.event.NotificationCreatedEvent;
import ma.intersig.fleetcore.repository.CamionRepository;
import ma.intersig.fleetcore.repository.NotificationRepository;
import ma.intersig.fleetcore.repository.SuiviVidangeRepository;
import ma.intersig.fleetcore.repository.UserRepository;
import ma.intersig.fleetcore.service.PneuAlertService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Component
public class NotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(NotificationScheduler.class);

    private final UserRepository userRepository;
    private final SuiviVidangeRepository suiviVidangeRepository;
    private final CamionRepository camionRepository;
    private final NotificationRepository notificationRepository;
    private final PneuAlertService pneuAlertService;
    private final ApplicationEventPublisher eventPublisher;
    private final long dedupWindowHours;

    public NotificationScheduler(UserRepository userRepository,
                                  SuiviVidangeRepository suiviVidangeRepository,
                                  CamionRepository camionRepository,
                                  NotificationRepository notificationRepository,
                                  PneuAlertService pneuAlertService,
                                  ApplicationEventPublisher eventPublisher,
                                  @Value("${app.notifications.dedup-window-hours:24}") long dedupWindowHours) {
        this.userRepository = userRepository;
        this.suiviVidangeRepository = suiviVidangeRepository;
        this.camionRepository = camionRepository;
        this.notificationRepository = notificationRepository;
        this.pneuAlertService = pneuAlertService;
        this.eventPublisher = eventPublisher;
        this.dedupWindowHours = dedupWindowHours;
    }

    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void runAlertScan() {
        processAlerts();
    }

    void processAlerts() {
        List<User> activeUsers = userRepository.findByActifTrue();
        OffsetDateTime dedupSince = OffsetDateTime.now().minusHours(dedupWindowHours);

        pneuAlertService.evaluateAll();
        processVidangeAlerts(activeUsers, dedupSince);
        processExpiryAlerts(activeUsers, dedupSince);
    }

    private void processVidangeAlerts(List<User> activeUsers, OffsetDateTime dedupSince) {
        List<SuiviVidange> depasse = suiviVidangeRepository.findByStatutWithVehicule("depasse");

        for (SuiviVidange vidange : depasse) {
            for (User user : activeUsers) {
                if (notificationRepository.existsByUserIdAndCategorieAndTargetIdAndCreatedAtAfter(
                        user.getId(), "seuil_nbh", vidange.getId(), dedupSince)) {
                    continue;
                }
                Notification notif = new Notification();
                notif.setUser(user);
                notif.setVehicule(vidange.getVehicule());
                notif.setSeverite("critical");
                notif.setCategorie("seuil_nbh");
                notif.setTitre("Vidange dépassée");
                notif.setDetail("Vidange du véhicule " + vidange.getVehicule().getCode() + " est dépassée");
                notif.setTargetScreen("vidanges");
                notif.setTargetId(vidange.getId());
                notif.setLu(false);
                notif.setEmailEnvoye(false);
                notificationRepository.save(notif);
                sendEmailIfCritical(notif, user);
            }
        }
    }

    private void processExpiryAlerts(List<User> activeUsers, OffsetDateTime dedupSince) {
        LocalDate threshold = LocalDate.now().plusDays(30);
        List<Camion> expiring = camionRepository.findExpiringBefore(threshold);

        for (Camion camion : expiring) {
            createExpiryNotifications(camion, activeUsers, dedupSince);
        }
    }

    private void createExpiryNotifications(Camion camion, List<User> activeUsers, OffsetDateTime dedupSince) {
        checkExpiry(camion, activeUsers, dedupSince,
                camion.getVisiteTechTracteurExpiration(), "visite_tech_tracteur",
                "Visite technique tracteur expirée", "tracteur");
        checkExpiry(camion, activeUsers, dedupSince,
                camion.getVisiteTechSemiExpiration(), "visite_tech_semi",
                "Visite technique semi expirée", "semi");
        checkExpiry(camion, activeUsers, dedupSince,
                camion.getCarnetCirculationExpiration(), "carnet_circulation",
                "Carnet de circulation expiré", "circulation");
        checkExpiry(camion, activeUsers, dedupSince,
                camion.getMetrologieExpiration(), "metrologie",
                "Métrologie expirée", "metrologie");
        checkExpiry(camion, activeUsers, dedupSince,
                camion.getExtincteurExpiration(), "extincteur",
                "Extincteur expiré", "extincteur");
    }

    private void checkExpiry(Camion camion, List<User> activeUsers, OffsetDateTime dedupSince,
                             LocalDate expiryDate, String category, String titre, String label) {
        if (expiryDate == null) return;
        LocalDate threshold = LocalDate.now().plusDays(30);
        if (!expiryDate.isBefore(threshold)) return;

        for (User user : activeUsers) {
            if (notificationRepository.existsByUserIdAndCategorieAndTargetIdAndCreatedAtAfter(
                    user.getId(), category, camion.getId(), dedupSince)) {
                continue;
            }
            Notification notif = new Notification();
            notif.setUser(user);
            notif.setVehicule(camion);
            notif.setSeverite("warning");
            notif.setCategorie(category);
            notif.setTitre(titre);
            notif.setDetail(camion.getCode() + " — " + label + " expire le " + expiryDate);
            notif.setTargetScreen("vehicules");
            notif.setTargetId(camion.getId());
            notif.setLu(false);
            notif.setEmailEnvoye(false);
            notificationRepository.save(notif);
            // Only send email for critical, not warning
        }
    }

    private void sendEmailIfCritical(Notification notif, User user) {
        if (!"critical".equals(notif.getSeverite())) return;
        OffsetDateTime dedupSince = OffsetDateTime.now().minusHours(dedupWindowHours);
        if (notificationRepository.existsByUserIdAndCategorieAndTargetIdAndEmailEnvoyeTrueAndEmailSentAtAfter(
                user.getId(), notif.getCategorie(), notif.getTargetId(), dedupSince)) {
            return;
        }
        eventPublisher.publishEvent(
                new NotificationCreatedEvent(notif.getId(), user.getEmail(), notif.getTitre(), notif.getDetail()));
    }
}