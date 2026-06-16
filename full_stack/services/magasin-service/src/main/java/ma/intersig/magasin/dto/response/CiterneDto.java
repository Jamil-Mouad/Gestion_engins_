package ma.intersig.magasin.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CiterneDto(
        Long id,
        String nom,
        BigDecimal capaciteLitres,
        BigDecimal densiteKgParLitre,
        BigDecimal hauteurMaxCm,
        BigDecimal stockInitialLitres,
        LocalDate stockInitialDate
) {
}
