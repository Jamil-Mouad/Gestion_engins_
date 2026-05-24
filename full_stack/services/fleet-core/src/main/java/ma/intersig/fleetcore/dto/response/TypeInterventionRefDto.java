package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.TypeIntervention;

public record TypeInterventionRefDto(Short id, String libelle) {
    public static TypeInterventionRefDto from(TypeIntervention t) {
        if (t == null) return null;
        return new TypeInterventionRefDto(t.getId(), t.getLibelle());
    }
}
