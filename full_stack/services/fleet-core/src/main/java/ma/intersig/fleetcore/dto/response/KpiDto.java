package ma.intersig.fleetcore.dto.response;

import java.math.BigDecimal;

public record KpiDto(
        double disponibilite,
        BigDecimal coutMensuelMad,
        long kmParcourusMois,
        long kmCumules,
        long totalVehicules,
        long enService,
        long enAtelier,
        long enMaintenance,
        long horsService,
        BigDecimal coutInterventionsMois,
        BigDecimal coutMainOeuvre,
        BigDecimal coutPieces,
        BigDecimal coutSousTraitance,
        long interventionsOuvertes,
        long vidangesEnRetard,
        long pneusWarnEmpty,
        long demandesEnAttente
) {}
