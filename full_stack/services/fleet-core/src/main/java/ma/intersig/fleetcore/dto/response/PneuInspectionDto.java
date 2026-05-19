package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.PneuInspection;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PneuInspectionDto(
        Long id,
        Long pneuId,
        OffsetDateTime dateInspection,
        Integer tireMeter,
        String activity,
        Long userId,
        BigDecimal pressionPsi,
        Short profondeur32e,
        String methode,
        String notes
) {
    public static PneuInspectionDto from(PneuInspection pi) {
        return new PneuInspectionDto(
                pi.getId(),
                pi.getPneu() != null ? pi.getPneu().getId() : null,
                pi.getDateInspection(),
                pi.getTireMeter(),
                pi.getActivity(),
                pi.getUser() != null ? pi.getUser().getId() : null,
                pi.getPressionPsi(),
                pi.getProfondeur32e(),
                pi.getMethode(),
                pi.getNotes()
        );
    }
}