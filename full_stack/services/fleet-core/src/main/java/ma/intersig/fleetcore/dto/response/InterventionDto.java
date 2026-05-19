package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Intervention;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record InterventionDto(
        Long id,
        Long vehiculeId,
        Short typeId,
        Long composantId,
        String categorie,
        String partie,
        String nBs,
        OffsetDateTime dateDebut,
        OffsetDateTime dateFin,
        BigDecimal tempsHeures,
        BigDecimal coutPieces,
        BigDecimal coutMainOeuvre,
        BigDecimal coutSousTraitance,
        BigDecimal coutTotal,
        String observations,
        Long demandeAchatId,
        OffsetDateTime createdAt
) {
    public static InterventionDto from(Intervention i) {
        return new InterventionDto(
                i.getId(),
                i.getVehicule() != null ? i.getVehicule().getId() : null,
                i.getTypeIntervention() != null ? i.getTypeIntervention().getId() : null,
                i.getComposant() != null ? i.getComposant().getId() : null,
                i.getCategorie(),
                i.getPartie(),
                i.getNBs(),
                i.getDateDebut(),
                i.getDateFin(),
                i.getTempsHeures(),
                i.getCoutPieces(),
                i.getCoutMainOeuvre(),
                i.getCoutSousTraitance(),
                i.getCoutTotal(),
                i.getObservations(),
                i.getDemandeAchat() != null ? i.getDemandeAchat().getId() : null,
                i.getCreatedAt()
        );
    }
}