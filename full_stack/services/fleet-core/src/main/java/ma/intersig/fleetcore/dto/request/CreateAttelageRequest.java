package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreateAttelageRequest(
    @NotNull Long tracteurId,
    @NotNull Long semiId,
    @NotNull LocalDate dateDebut
) {}
