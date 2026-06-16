package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record TerminateAttelageRequest(
    @NotNull LocalDate dateFin
) {}
