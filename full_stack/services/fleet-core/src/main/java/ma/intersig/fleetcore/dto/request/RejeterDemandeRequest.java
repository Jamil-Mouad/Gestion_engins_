package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RejeterDemandeRequest(
        @NotBlank String raison
) {}