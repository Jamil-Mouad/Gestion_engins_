package ma.intersig.magasin.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LastTotaliseurDto(
        BigDecimal totaliseur,
        LocalDate dateSortie
) {
}
