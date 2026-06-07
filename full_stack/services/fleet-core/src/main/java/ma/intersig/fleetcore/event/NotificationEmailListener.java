package ma.intersig.fleetcore.event;

import ma.intersig.fleetcore.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class NotificationEmailListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEmailListener.class);

    private final JavaMailSender mailSender;
    private final NotificationRepository notificationRepository;

    public NotificationEmailListener(JavaMailSender mailSender, NotificationRepository notificationRepository) {
        this.mailSender = mailSender;
        this.notificationRepository = notificationRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(event.userEmail());
            msg.setSubject(event.titre());
            msg.setText(event.detail());
            mailSender.send(msg);
            notificationRepository.findById(event.notificationId())
                    .ifPresent(n -> {
                        n.setEmailEnvoye(true);
                        n.setEmailSentAt(OffsetDateTime.now());
                        notificationRepository.save(n);
                    });
        } catch (MailException e) {
            log.warn("Failed to send notification email to {}: {}", event.userEmail(), e.getMessage());
        }
    }
}
