package ma.intersig.fleetcore.dto.request;

import java.math.BigDecimal;

public record CreateComposantRequest(
        Long parentId,
        Short niveau,
        String designation,
        String reference,
        String categorie,
        String unite,
        String marque,
        BigDecimal prixUnitaire,
        Integer stock,
        String imageUrl,
        String vehiculeType
) {}