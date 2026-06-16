package ma.intersig.magasin.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ArrivageDto(
        Long id,
        LocalDate dateArrivage,
        String numeroBl,
        BigDecimal quantiteLitres,
        BigDecimal prixUnitaireHt,
        BigDecimal valeurHt,
        String fournisseur,
        String source
) {
}
