package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.DemandeAchat;

import java.time.OffsetDateTime;

public record DemandeAchatDto(
        Long id,
        String code,
        OffsetDateTime dateDemande,
        Long demandeurId,
        String demandeurPrenom,
        String demandeurNom,
        Long composantId,
        String composantDesignation,
        String pieceLibre,
        String reference,
        Integer quantite,
        String motif,
        String urgence,
        Long fournisseurId,
        String fournisseurNom,
        String statut,
        Long approbateurId,
        String approbateurPrenom,
        String approbateurNom,
        OffsetDateTime dateApprobation,
        String raisonRejet,
        String bonCommandeUrl,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static DemandeAchatDto from(DemandeAchat da) {
        return new DemandeAchatDto(
                da.getId(),
                da.getCode(),
                da.getDateDemande(),
                da.getDemandeur() != null ? da.getDemandeur().getId() : null,
                da.getDemandeur() != null ? da.getDemandeur().getPrenom() : null,
                da.getDemandeur() != null ? da.getDemandeur().getNom() : null,
                da.getComposant() != null ? da.getComposant().getId() : null,
                da.getComposant() != null ? da.getComposant().getDesignation() : null,
                da.getPieceLibre(),
                da.getReference(),
                da.getQuantite(),
                da.getMotif(),
                da.getUrgence(),
                da.getFournisseur() != null ? da.getFournisseur().getId() : null,
                da.getFournisseur() != null ? da.getFournisseur().getNom() : null,
                da.getStatut(),
                da.getApprobateur() != null ? da.getApprobateur().getId() : null,
                da.getApprobateur() != null ? da.getApprobateur().getPrenom() : null,
                da.getApprobateur() != null ? da.getApprobateur().getNom() : null,
                da.getDateApprobation(),
                da.getRaisonRejet(),
                da.getBonCommandeUrl(),
                da.getCreatedAt(),
                da.getUpdatedAt()
        );
    }
}