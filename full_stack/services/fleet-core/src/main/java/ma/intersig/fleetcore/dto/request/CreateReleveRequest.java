package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.OffsetDateTime;

public record CreateReleveRequest(
        @NotNull Long vehiculeId,
        @NotNull OffsetDateTime dateReleve,
        @NotNull @PositiveOrZero Integer compteurKm,
        @PositiveOrZero Integer compteurHeures
) {}