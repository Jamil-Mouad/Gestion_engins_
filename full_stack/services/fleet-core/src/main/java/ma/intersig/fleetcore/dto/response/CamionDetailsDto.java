package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Camion;

import java.math.BigDecimal;
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
        String chauffeurNom
) {
    public static CamionDetailsDto from(Camion c) {
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
                c.getChauffeurNom()
        );
    }
}