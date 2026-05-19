package ma.intersig.fleetcore.dto.response;

import java.time.LocalDate;
import java.util.List;

public record PlanningWeekDto(
        String semaine,
        LocalDate dateDebut,
        LocalDate dateFin,
        List<VidangePlanItemDto> vidanges
) {}