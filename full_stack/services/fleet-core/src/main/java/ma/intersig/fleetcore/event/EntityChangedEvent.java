package ma.intersig.fleetcore.event;

import org.springframework.context.ApplicationEvent;

public class EntityChangedEvent extends ApplicationEvent {
    private final String entityType;
    private final Long entityId;
    private final String action;

    public EntityChangedEvent(Object source, String entityType, Long entityId, String action) {
        super(source);
        this.entityType = entityType;
        this.entityId = entityId;
        this.action = action;
    }

    public String getEntityType() { return entityType; }
    public Long getEntityId() { return entityId; }
    public String getAction() { return action; }
}
