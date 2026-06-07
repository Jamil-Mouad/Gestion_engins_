package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdatePneuRequest(
        String nSerie,
        String marque,
        LocalDate dateMontage,
        @Positive Integer expectedLifeKm,
        BigDecimal pressionPsi,
        Short profondeur32e,
        String photoUrl
) {}
