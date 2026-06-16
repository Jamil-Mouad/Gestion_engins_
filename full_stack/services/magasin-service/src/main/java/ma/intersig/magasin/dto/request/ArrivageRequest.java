package ma.intersig.magasin.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ArrivageRequest(
        @NotNull LocalDate dateArrivage,
        @Size(max = 40) String numeroBl,
        @NotNull @DecimalMin(value = "0.01") BigDecimal quantiteLitres,
        @DecimalMin(value = "0.0001") BigDecimal prixUnitaireHt,
        @Size(max = 120) String fournisseur
) {
}
