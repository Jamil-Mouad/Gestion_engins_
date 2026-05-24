package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Intervention;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record InterventionDto(
        Long id,
        VehiculeRefDto vehicule,
        TypeInterventionRefDto typeIntervention,
        ComposantRefDto composant,
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
        OffsetDateTime createdAt,
        String statut
) {
    public static InterventionDto from(Intervention i) {
        String statut = i.getDateFin() != null ? "cloture" : "en_cours";
        return new InterventionDto(
                i.getId(),
                VehiculeRefDto.from(i.getVehicule()),
                TypeInterventionRefDto.from(i.getTypeIntervention()),
                ComposantRefDto.from(i.getComposant()),
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
                i.getCreatedAt(),
                statut
        );
    }
}
