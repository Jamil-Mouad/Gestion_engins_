package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.ReleveCompteur;

import java.time.OffsetDateTime;

public record ReleveCompteurDto(
        Long id,
        Long vehiculeId,
        OffsetDateTime dateReleve,
        Integer compteurKm,
        Integer compteurHeures,
        String source,
        Long importId,
        Long createdById
) {
    public static ReleveCompteurDto from(ReleveCompteur r) {
        return new ReleveCompteurDto(
                r.getId(),
                r.getVehicule() != null ? r.getVehicule().getId() : null,
                r.getDateReleve(),
                r.getCompteurKm(),
                r.getCompteurHeures(),
                r.getSource(),
                r.getImportHistorique() != null ? r.getImportHistorique().getId() : null,
                r.getCreatedBy() != null ? r.getCreatedBy().getId() : null
        );
    }
}