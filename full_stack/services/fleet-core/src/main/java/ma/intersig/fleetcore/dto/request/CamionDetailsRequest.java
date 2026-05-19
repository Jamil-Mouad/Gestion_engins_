package ma.intersig.fleetcore.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CamionDetailsRequest(
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
) {}