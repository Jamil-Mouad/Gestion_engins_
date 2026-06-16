package ma.intersig.magasin.dto.response;

import java.math.BigDecimal;

public record VehiculeKpiDto(
        Long vehiculeId,
        String code,
        String type,
        String month,
        long voyagesMois,
        BigDecimal kmParcourusMois,
        BigDecimal kmCumules,
        BigDecimal consoLitresMois,
        BigDecimal consoMoyenneL100,
        BigDecimal pctConsoVsFlotte
) {}
