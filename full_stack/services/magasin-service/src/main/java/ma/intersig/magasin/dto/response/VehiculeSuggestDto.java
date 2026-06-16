package ma.intersig.magasin.dto.response;

public record VehiculeSuggestDto(
        Long id,
        String code,
        String type,
        String marque,
        String modele,
        String matricule
) {
}
