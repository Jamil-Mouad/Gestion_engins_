package ma.intersig.magasin.dto.response;

import java.math.BigDecimal;

public record ConversionDto(
        BigDecimal hauteurCm,
        BigDecimal litres,
        BigDecimal tonnes
) {
}
