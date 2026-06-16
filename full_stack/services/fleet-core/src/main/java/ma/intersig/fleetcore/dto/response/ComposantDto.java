package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Composant;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public record ComposantDto(
        Long id,
        Long parentId,
        Short niveau,
        String designation,
        String reference,
        String categorie,
        String unite,
        String marque,
        BigDecimal prixUnitaire,
        Integer stock,
        Boolean actif,
        String imageUrl,
        String vehiculeType,
        Long vehiculeId,
        String vehiculeCode,
        List<ComposantDto> children
) {
    public static ComposantDto from(Composant c) {
        return new ComposantDto(
                c.getId(),
                c.getParent() != null ? c.getParent().getId() : null,
                c.getNiveau(),
                c.getDesignation(),
                c.getReference(),
                c.getCategorie(),
                c.getUnite(),
                c.getMarque(),
                c.getPrixUnitaire(),
                c.getStock(),
                c.getActif(),
                c.getImageUrl(),
                c.getVehiculeType(),
                c.getVehicule() != null ? c.getVehicule().getId() : null,
                c.getVehicule() != null ? c.getVehicule().getCode() : null,
                new ArrayList<>()
        );
    }
}