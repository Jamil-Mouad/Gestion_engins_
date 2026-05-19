package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateDemandeAchatRequest(
        Long composantId,
        String pieceLibre,
        @NotNull @Positive Integer quantite,
        String motif,
        String urgence,
        Long fournisseurId
) {
    @AssertTrue(message = "Either composantId or pieceLibre must be provided, but not both")
    public boolean isComposantOrPieceLibre() {
        return (composantId != null) != (pieceLibre != null);
    }
}