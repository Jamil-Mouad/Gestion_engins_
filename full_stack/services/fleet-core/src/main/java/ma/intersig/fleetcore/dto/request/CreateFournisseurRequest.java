package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateFournisseurRequest(
        @NotBlank String nom,
        String contact,
        String email,
        String tel,
        String ice
) {}