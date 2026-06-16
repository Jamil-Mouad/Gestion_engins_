package ma.intersig.magasin.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record JaugeageDto(
        Long id,
        LocalDate dateJaugeage,
        BigDecimal hauteurCm,
        BigDecimal litresMesures,
        BigDecimal litresTheoriques,
        BigDecimal ecartLitres
) {
}
