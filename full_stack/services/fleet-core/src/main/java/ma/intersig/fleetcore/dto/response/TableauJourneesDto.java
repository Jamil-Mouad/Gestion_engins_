package ma.intersig.fleetcore.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.util.List;

public record TableauJourneesDto(
        LocalDate date,
        List<VehiculeStatusDto> vehicules,
        StatsDto stats
) {
    public record VehiculeStatusDto(
            Long id,
            String code,
            String matricule,
            String type,
            String statut,
            String chauffeurNom
    ) {}

    public record StatsDto(
            int total,
            int enService,
            int workshop,
            int maintenance,
            int horsService
    ) {}
}