package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PatchVehiculeStatutRequest(
        @NotBlank(message = "statut is required") String statut
) {}
