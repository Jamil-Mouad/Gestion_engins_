package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Camion;
import ma.intersig.fleetcore.entity.Vehicule;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record VehiculeDto(
        Long id,
        String code,
        String type,
        String marque,
        String modele,
        String matricule,
        String nChassis,
        Short annee,
        String carburant,
        String statut,
        LocalDate dateMiseService,
        String photoUrl,
        Boolean actif,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        CamionDetailsDto camionDetails,
        AttelageDto currentAttelage,
        String configAxleSemi
) {
    public static VehiculeDto from(Vehicule v, AttelageDto currentAttelage) {
        return from(v, currentAttelage, null);
    }

    public static VehiculeDto from(Vehicule v, AttelageDto currentAttelage, java.math.BigDecimal pctConsoVsFlotte) {
        CamionDetailsDto details = null;
        if (v instanceof Camion c) {
            details = CamionDetailsDto.from(c, pctConsoVsFlotte);
        }
        return new VehiculeDto(
                v.getId(), v.getCode(), v.getType(), v.getMarque(), v.getModele(),
                v.getMatricule(), v.getNChassis(), v.getAnnee(), v.getCarburant(),
                v.getStatut(), v.getDateMiseService(), v.getPhotoUrl(),
                v.getActif(), v.getCreatedAt(), v.getUpdatedAt(),
                details, currentAttelage, v.getConfigAxleSemi()
        );
    }

    public static VehiculeDto fromList(Vehicule v) {
        return new VehiculeDto(
                v.getId(), v.getCode(), v.getType(), v.getMarque(), v.getModele(),
                v.getMatricule(), v.getNChassis(), v.getAnnee(), v.getCarburant(),
                v.getStatut(), v.getDateMiseService(), v.getPhotoUrl(),
                v.getActif(), v.getCreatedAt(), v.getUpdatedAt(),
                null, null, v.getConfigAxleSemi()
        );
    }
}
