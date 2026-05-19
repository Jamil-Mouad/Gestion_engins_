package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CreateInterventionRequest(
        @NotNull Long vehiculeId,
        @NotNull Short typeId,
        Long composantId,
        @NotNull String categorie,
        String partie,
        String nBs,
        @NotNull OffsetDateTime dateDebut,
        BigDecimal coutPieces,
        BigDecimal coutMainOeuvre,
        BigDecimal coutSousTraitance,
        String observations
) {}