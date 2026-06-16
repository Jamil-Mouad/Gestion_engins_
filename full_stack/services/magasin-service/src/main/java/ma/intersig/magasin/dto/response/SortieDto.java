package ma.intersig.magasin.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SortieDto(
        Long id,
        LocalDate dateSortie,
        BigDecimal totaliseur,
        BigDecimal quantiteLitres,
        String typeMouvement,
        String destination,
        Long vehiculeId,
        String vehiculeCode,
        Boolean tiers,
        BigDecimal compteur,
        String demandeur,
        String numeroBs,
        String source
) {
}
