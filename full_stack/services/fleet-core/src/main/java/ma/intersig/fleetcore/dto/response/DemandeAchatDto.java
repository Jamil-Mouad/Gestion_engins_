package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.DemandeAchat;

import java.time.OffsetDateTime;

public record DemandeAchatDto(
        Long id,
        String code,
        OffsetDateTime dateDemande,
        UserRefDto demandeur,
        ComposantRefDto composant,
        String pieceLibre,
        String reference,
        Integer quantite,
        String motif,
        String urgence,
        String statut,
        UserRefDto approbateur,
        OffsetDateTime dateApprobation,
        String raisonRejet,
        String bonCommandeUrl,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String demandeurNom,
        String photoUrl
) {
    public static DemandeAchatDto from(DemandeAchat da) {
        return new DemandeAchatDto(
                da.getId(),
                da.getCode(),
                da.getDateDemande(),
                UserRefDto.from(da.getDemandeur()),
                ComposantRefDto.from(da.getComposant()),
                da.getPieceLibre(),
                da.getReference(),
                da.getQuantite(),
                da.getMotif(),
                da.getUrgence(),
                da.getStatut(),
                UserRefDto.from(da.getApprobateur()),
                da.getDateApprobation(),
                da.getRaisonRejet(),
                da.getBonCommandeUrl(),
                da.getCreatedAt(),
                da.getUpdatedAt(),
                da.getDemandeurNom(),
                da.getPhotoUrl()
        );
    }
}
