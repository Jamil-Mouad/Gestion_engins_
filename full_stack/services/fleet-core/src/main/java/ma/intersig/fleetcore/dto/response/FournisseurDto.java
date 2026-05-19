package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Fournisseur;

import java.time.OffsetDateTime;

public record FournisseurDto(
        Long id,
        String nom,
        String contact,
        String email,
        String tel,
        String ice,
        Boolean actif,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static FournisseurDto from(Fournisseur f) {
        return new FournisseurDto(
                f.getId(),
                f.getNom(),
                f.getContact(),
                f.getEmail(),
                f.getTel(),
                f.getIce(),
                f.getActif(),
                f.getCreatedAt(),
                f.getUpdatedAt()
        );
    }
}