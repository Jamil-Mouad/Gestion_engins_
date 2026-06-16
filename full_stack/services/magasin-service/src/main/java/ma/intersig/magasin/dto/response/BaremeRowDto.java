package ma.intersig.magasin.dto.response;

import java.math.BigDecimal;

public record BaremeRowDto(
        Long id,
        BigDecimal hauteurCm,
        BigDecimal litres
) {
}
