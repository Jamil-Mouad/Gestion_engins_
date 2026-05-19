package ma.intersig.fleetcore.dto.response;

import java.math.BigDecimal;

public record KpiDto(
        double disponibilite,
        BigDecimal coutMensuelMad,
        long kmParcourusMois,
        long kmCumules
) {}