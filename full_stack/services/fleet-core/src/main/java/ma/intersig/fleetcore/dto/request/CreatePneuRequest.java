package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePneuRequest(
        short position,
        @NotBlank String nSerie,
        @NotBlank String reference,
        String marque,
        LocalDate dateMontage,
        int expectedLifeKm,
        BigDecimal pressionPsi,
        Short profondeur32e
) {}