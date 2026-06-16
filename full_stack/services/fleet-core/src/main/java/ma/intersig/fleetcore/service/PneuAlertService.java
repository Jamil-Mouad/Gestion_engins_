package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.entity.Notification;
import ma.intersig.fleetcore.entity.Pneu;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.event.NotificationCreatedEvent;
import ma.intersig.fleetcore.repository.NotificationRepository;
import ma.intersig.fleetcore.repository.PneuRepository;
import ma.intersig.fleetcore.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Raises {@code seuil_pneu} notifications for tyres approaching / past their life limit.
 *
 * <p>Tyre km is advanced by the {@code process_releve} DB trigger whenever a
 * {@code releves_compteur} row is inserted. This service classifies the resulting
 * {@code km_restant} and notifies active users:
 * <ul>
 *   <li>{@code <= 0} &rarr; <b>critical</b> "Pneu épuisé"</li>
 *   <li>{@code <= approcheKm} (default 1000) &rarr; <b>critical</b> "Pneu proche de la limite"</li>
 *   <li>{@code < 5000} &rarr; <b>warning</b> "Pneu en alerte"</li>
 * </ul>
 *
 * <p>Used both by the hourly {@link ma.intersig.fleetcore.scheduler.NotificationScheduler}
 * ({@link #evaluateAll()}) and, in real time, right after a counter reading is recorded
 * ({@link #evaluateVehicule(Long)}).
 */
@Service
public class PneuAlertService {

    private enum Tier { EMPTY, APPROCHE, WARN }

    private final UserRepository userRepository;
    private final PneuRepository pneuRepository;
    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final long dedupWindowHours;
    private final int approcheKm;

    public PneuAlertService(UserRepository userRepository,
                            PneuRepository pneuRepository,
                            NotificationRepository notificationRepository,
                            ApplicationEventPublisher eventPublisher,
                            @Value("${app.notifications.dedup-window-hours:24}") long dedupWindowHours,
                            @Value("${app.notifications.pneu-approche-km:1000}") int approcheKm) {
        this.userRepository = userRepository;
        this.pneuRepository = pneuRepository;
        this.notificationRepository = notificationRepository;
        this.eventPublisher = eventPublisher;
        this.dedupWindowHours = dedupWindowHours;
        this.approcheKm = approcheKm;
    }

    /** Hourly scan over every tyre already flagged warn/empty by the DB trigger. */
    @Transactional
    public void evaluateAll() {
        List<User> activeUsers = userRepository.findByActifTrue();
        OffsetDateTime dedupSince = OffsetDateTime.now().minusHours(dedupWindowHours);
        for (Pneu pneu : pneuRepository.findByStatusInWithVehicule(List.of("warn", "empty"))) {
            notifyForPneu(pneu, activeUsers, dedupSince);
        }
    }

    /** Real-time evaluation of a single vehicle's active tyres after a counter reading. */
    @Transactional
    public void evaluateVehicule(Long vehiculeId) {
        if (vehiculeId == null) return;
        List<User> activeUsers = userRepository.findByActifTrue();
        OffsetDateTime dedupSince = OffsetDateTime.now().minusHours(dedupWindowHours);
        for (Pneu pneu : pneuRepository.findByVehiculeIdAndActifTrue(vehiculeId)) {
            notifyForPneu(pneu, activeUsers, dedupSince);
        }
    }

    private void notifyForPneu(Pneu pneu, List<User> activeUsers, OffsetDateTime dedupSince) {
        // gate on the DB-maintained status (set by update_pneu_status); a tyre is only
        // alert-worthy once the trigger has flagged it warn/empty
        Tier tier = classify(pneu);
        if (tier == null) return;
        Integer kmRestant = computeKmRestant(pneu);

        for (User user : activeUsers) {
            if (notificationRepository.existsByUserIdAndCategorieAndTargetIdAndCreatedAtAfter(
                    user.getId(), "seuil_pneu", pneu.getId(), dedupSince)) {
                continue;
            }
            Notification notif = new Notification();
            notif.setUser(user);
            notif.setVehicule(pneu.getVehicule());
            notif.setSeverite(severite(tier));
            notif.setCategorie("seuil_pneu");
            notif.setTitre(titre(tier));
            notif.setDetail(detail(pneu, tier, kmRestant));
            notif.setTargetScreen("pneus");
            notif.setTargetId(pneu.getId());
            notif.setLu(false);
            notif.setEmailEnvoye(false);
            notificationRepository.save(notif);
            sendEmailIfCritical(notif, user);
        }
    }

    private Integer computeKmRestant(Pneu pneu) {
        if (pneu.getKmRestant() != null) {
            return pneu.getKmRestant();
        }
        if (pneu.getExpectedLifeKm() == null || pneu.getKmParcourus() == null) {
            return null;
        }
        return pneu.getExpectedLifeKm() - pneu.getKmParcourus();
    }

    /**
     * Gate on the trigger-maintained status, then refine the tier from remaining km:
     * {@code empty}&rarr;EMPTY; {@code warn} with km ≤ approche threshold&rarr;APPROCHE;
     * otherwise {@code warn}&rarr;WARN. Returns {@code null} (no alert) for an {@code ok} tyre.
     */
    private Tier classify(Pneu pneu) {
        String status = pneu.getStatus();
        if ("empty".equals(status)) return Tier.EMPTY;
        if (!"warn".equals(status)) return null;
        Integer kmRestant = computeKmRestant(pneu);
        if (kmRestant != null && kmRestant <= 0) return Tier.EMPTY;
        if (kmRestant != null && kmRestant <= approcheKm) return Tier.APPROCHE;
        return Tier.WARN;
    }

    private String severite(Tier tier) {
        return tier == Tier.WARN ? "warning" : "critical";
    }

    private String titre(Tier tier) {
        return switch (tier) {
            case EMPTY -> "Pneu épuisé";
            case APPROCHE -> "Pneu proche de la limite";
            case WARN -> "Pneu en alerte";
        };
    }

    private String detail(Pneu pneu, Tier tier, Integer kmRestant) {
        String vehicule = pneu.getVehicule() != null ? pneu.getVehicule().getCode() : "?";
        String base = "Pneu position " + pneu.getPosition() + " du véhicule " + vehicule;
        String restant = kmRestant != null ? kmRestant + " km restants" : "km restants inconnus";
        return switch (tier) {
            case EMPTY -> base + " a atteint sa limite de vie (0 km restant).";
            case APPROCHE -> base + " est proche de sa limite — " + restant + ".";
            case WARN -> base + " est en alerte — " + restant + ".";
        };
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
