package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Camion;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

public record CamionDetailsDto(
        BigDecimal capaciteTonnes,
        String configAxle,
        LocalDate visiteTechTracteurExpiration,
        LocalDate visiteTechSemiExpiration,
        LocalDate carnetCirculationExpiration,
        LocalDate metrologieExpiration,
        LocalDate extincteurExpiration,
        String batterieModele,
        LocalDate batterieDateAchat,
        LocalDate batterieDateControle,
        BigDecimal consoGasoilLitresMois,
        Integer compteurKm,
        Integer compteurHeures,
        String chauffeurPrenom,
        String chauffeurNom,
        // KPI fields
        Integer voyagesMois,
        Integer kmParcourus,
        /** Computed at read-time: vehicle conso / fleet-total conso * 100. Null when fleet total is zero. */
        BigDecimal pctConsoVsFlotte
) {
    /**
     * Build from entity only (pctConsoVsFlotte defaults to null).
     * Use {@link #from(Camion, BigDecimal)} when the computed percentage is available.
     */
    public static CamionDetailsDto from(Camion c) {
        return from(c, null);
    }

    public static CamionDetailsDto from(Camion c, BigDecimal pctConsoVsFlotte) {
        return new CamionDetailsDto(
                c.getCapaciteTonnes(),
                c.getConfigAxle(),
                c.getVisiteTechTracteurExpiration(),
                c.getVisiteTechSemiExpiration(),
                c.getCarnetCirculationExpiration(),
                c.getMetrologieExpiration(),
                c.getExtincteurExpiration(),
                c.getBatterieModele(),
                c.getBatterieDateAchat(),
                c.getBatterieDateControle(),
                c.getConsoGasoilLitresMois(),
                c.getCompteurKm(),
                c.getCompteurHeures(),
                c.getChauffeurPrenom(),
                c.getChauffeurNom(),
                c.getVoyagesMois(),
                c.getKmParcourus(),
                pctConsoVsFlotte
        );
    }

    /**
     * Compute the percentage given the vehicle's own consumption and the fleet total.
     * Returns null when either value is null / zero to avoid division by zero.
     */
    public static BigDecimal computePct(BigDecimal vehicleConso, BigDecimal fleetTotal) {
        if (vehicleConso == null || fleetTotal == null || fleetTotal.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        return vehicleConso.multiply(BigDecimal.valueOf(100))
                .divide(fleetTotal, 2, RoundingMode.HALF_UP);
    }
}
