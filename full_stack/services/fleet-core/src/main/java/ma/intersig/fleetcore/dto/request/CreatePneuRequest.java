package ma.intersig.fleetcore.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePneuRequest(
        short position,
        String nSerie,
        String marque,
        LocalDate dateMontage,
        int expectedLifeKm,
        BigDecimal pressionPsi,
        Short profondeur32e
) {}