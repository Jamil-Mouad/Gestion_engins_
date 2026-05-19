package ma.intersig.fleetcore.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record HistoriqueItemDto(
        String type,
        Long id,
        Long vehiculeId,
        OffsetDateTime date,
        String categorie,
        String partie,
        BigDecimal coutTotal,
        Integer compteurKm,
        String activity
) {}