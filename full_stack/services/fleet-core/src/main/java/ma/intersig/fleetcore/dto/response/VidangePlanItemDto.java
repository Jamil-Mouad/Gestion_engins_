package ma.intersig.fleetcore.dto.response;

public record VidangePlanItemDto(
        Long id,
        String vehiculeCode,
        String composantDesignation,
        String statut,
        Integer intervalleNbh,
        Integer nbhRestant
) {}