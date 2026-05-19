package ma.intersig.fleetcore.event;

public record NotificationCreatedEvent(Long notificationId, String userEmail, String titre, String detail) {}
