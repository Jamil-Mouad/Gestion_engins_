package ma.intersig.magasin.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CiterneUpdateRequest(
        @NotBlank String nom,
        @NotNull @DecimalMin(value = "1") BigDecimal capaciteLitres,
        @NotNull @DecimalMin(value = "0.0001") BigDecimal densiteKgParLitre,
        BigDecimal hauteurMaxCm,
        @NotNull BigDecimal stockInitialLitres,
        @NotNull LocalDate stockInitialDate
) {
}
