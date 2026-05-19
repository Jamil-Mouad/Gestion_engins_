package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.SuiviVidange;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record SuiviVidangeDto(
        Long id,
        Long vehiculeId,
        Long composantId,
        Integer intervalleNbh,
        Integer compteurNbhActuel,
        Integer nbhRestant,
        LocalDate dateDernierEntretien,
        LocalDate prochainEntretienEstime,
        String statut,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static SuiviVidangeDto from(SuiviVidange v) {
        return new SuiviVidangeDto(
                v.getId(),
                v.getVehicule() != null ? v.getVehicule().getId() : null,
                v.getComposant() != null ? v.getComposant().getId() : null,
                v.getIntervalleNbh(),
                v.getCompteurNbhActuel(),
                v.getNbhRestant(),
                v.getDateDernierEntretien(),
                v.getProchainEntretienEstime(),
                v.getStatut(),
                v.getCreatedAt(),
                v.getUpdatedAt()
        );
    }
}