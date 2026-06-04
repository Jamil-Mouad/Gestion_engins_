package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Pneu;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PneuDto(
        Long id,
        Long vehiculeId,
        String vehiculeCode,
        Short position,
        Long composantId,
        String nSerie,
        String marque,
        LocalDate dateMontage,
        Integer kmMontage,
        Integer kmParcourus,
        Integer expectedLifeKm,
        Integer kmRestant,
        BigDecimal pressionPsi,
        Short profondeur32e,
        String status,
        Boolean actif
) {
    public static PneuDto from(Pneu p) {
        return new PneuDto(
                p.getId(),
                p.getVehicule() != null ? p.getVehicule().getId() : null,
                p.getVehicule() != null ? p.getVehicule().getCode() : null,
                p.getPosition(),
                p.getComposant() != null ? p.getComposant().getId() : null,
                p.getNSerie(),
                p.getMarque(),
                p.getDateMontage(),
                p.getKmMontage(),
                p.getKmParcourus(),
                p.getExpectedLifeKm(),
                p.getKmRestant(),
                p.getPressionPsi(),
                p.getProfondeur32e(),
                p.getStatus(),
                p.getActif()
        );
    }
}