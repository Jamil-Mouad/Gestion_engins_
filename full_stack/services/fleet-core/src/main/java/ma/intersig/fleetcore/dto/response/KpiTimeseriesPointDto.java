package ma.intersig.fleetcore.dto.response;

public record KpiTimeseriesPointDto(
        String mois,
        double disponibilite
) {}