package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Notification;

import java.time.OffsetDateTime;
import java.util.Objects;

public record NotificationDto(
        Long id,
        Long userId,
        Long vehiculeId,
        String severite,
        String categorie,
        String titre,
        String detail,
        String targetScreen,
        Long targetId,
        Boolean lu,
        Boolean emailEnvoye,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static NotificationDto from(Notification n) {
        Objects.requireNonNull(n, "Notification must not be null");
        return new NotificationDto(
                n.getId(),
                n.getUser() != null ? n.getUser().getId() : null,
                n.getVehicule() != null ? n.getVehicule().getId() : null,
                n.getSeverite(),
                n.getCategorie(),
                n.getTitre(),
                n.getDetail(),
                n.getTargetScreen(),
                n.getTargetId(),
                n.getLu(),
                n.getEmailEnvoye(),
                n.getCreatedAt(),
                n.getUpdatedAt()
        );
    }
}