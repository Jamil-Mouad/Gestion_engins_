package ma.intersig.magasin.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record JaugeageRequest(
        @NotNull LocalDate dateJaugeage,
        @NotNull @DecimalMin(value = "0") BigDecimal hauteurCm
) {
}
