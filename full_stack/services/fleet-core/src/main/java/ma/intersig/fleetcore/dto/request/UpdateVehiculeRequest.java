package ma.intersig.fleetcore.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record UpdateVehiculeRequest(
        @NotBlank String marque,
        @NotBlank String modele,
        String matricule,
        String nChassis,
        Short annee,
        String carburant,
        @NotBlank String statut,
        LocalDate dateMiseService,
        String photoUrl,
        String chauffeurPrenom,
        String chauffeurNom,
        @Valid CamionDetailsRequest camionDetails
) {}