package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public record RemplacerPneuRequest(
        @NotBlank String nSerie,
        @NotBlank String marque,
        @NotNull @PastOrPresent LocalDate dateMontage,
        @Positive int expectedLifeKm,
        @NotNull @Positive BigDecimal pressionPsi,
        @Min(0) @Max(32) Short profondeur32e
) {}