package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.NotNull;

public record RemonterPneuRequest(
    @NotNull Long vehiculeId,
    @NotNull Short position
) {}
