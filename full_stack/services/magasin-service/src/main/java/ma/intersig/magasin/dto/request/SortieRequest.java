package ma.intersig.magasin.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SortieRequest(
        @NotNull LocalDate dateSortie,
        BigDecimal totaliseur,
        @NotNull @DecimalMin(value = "0.01") BigDecimal quantiteLitres,
        @Pattern(regexp = "SORTIE|RETOUR") String typeMouvement,
        @NotBlank @Size(max = 120) String destination,
        Long vehiculeId,
        @Size(max = 20) String vehiculeCode,
        Boolean tiers,
        BigDecimal compteur,
        @Size(max = 120) String demandeur,
        @Size(max = 40) String numeroBs
) {
}
