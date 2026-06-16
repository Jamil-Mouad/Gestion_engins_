package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.TracteurSemiAssignment;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record AttelageDto(
    Long id,
    Long tracteurId,
    String tracteurCode,
    Long semiId,
    String semiCode,
    LocalDate dateDebut,
    LocalDate dateFin,
    Boolean actif,
    OffsetDateTime createdAt,
    String semiConfigAxle
) {
    public static AttelageDto from(TracteurSemiAssignment a) {
        return new AttelageDto(
            a.getId(),
            a.getTracteur().getId(),
            a.getTracteur().getCode(),
            a.getSemi().getId(),
            a.getSemi().getCode(),
            a.getDateDebut(),
            a.getDateFin(),
            a.getActif(),
            a.getCreatedAt(),
            a.getSemi().getConfigAxleSemi()
        );
    }
}
