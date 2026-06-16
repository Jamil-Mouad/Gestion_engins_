package ma.intersig.fleetcore.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateDemandeAchatRequest(
        Long composantId,
        String pieceLibre,
        String reference,
        @NotNull @Positive Integer quantite,
        String motif,
        String urgence,
        /** Free-text full name of the worker making the request (optional). */
        String demandeurNom,
        /** URL of a photo of the purchase order / proof document. */
        String photoUrl
) {
    @AssertTrue(message = "Either composantId or pieceLibre must be provided, but not both")
    public boolean isComposantOrPieceLibre() {
        return (composantId != null) != (pieceLibre != null);
    }
}
