package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.Positive;

public record PermuterPneuRequest(
        @Positive short nouvellePosition
) {}