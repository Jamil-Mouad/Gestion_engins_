package ma.intersig.magasin.service;

import ma.intersig.magasin.entity.VehiculeRef;
import ma.intersig.magasin.repository.VehiculeRefRepository;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Resolves a fuel-log vehicle code to a {@link VehiculeRef}. The log records
 * bare numbers (409) while vehicules.code carries a prefix (CAM-409), so both
 * exact and «…-code» suffix matches are accepted — exact wins. Codes are
 * unique per type only (a tracteur shares its code with its semi-remorque),
 * so powered types win next: camion first, then camion_tracteur.
 */
@Component
public class VehiculeLookup {

    private static final List<String> TYPE_PRIORITY = List.of("camion", "camion_tracteur");

    private final VehiculeRefRepository vehiculeRepository;

    public VehiculeLookup(VehiculeRefRepository vehiculeRepository) {
        this.vehiculeRepository = vehiculeRepository;
    }

    public Optional<VehiculeRef> resolveByCode(String code) {
        return resolveByCode(code, null);
    }

    public Optional<VehiculeRef> resolveByCode(String code, String type) {
        if (code == null || code.isBlank()) return Optional.empty();
        String trimmed = code.trim();
        List<VehiculeRef> matches = vehiculeRepository.findByCodeForResolution(trimmed);
        if (type != null && !type.isBlank()) {
            matches = matches.stream().filter(v -> type.equals(v.getType())).toList();
        }
        return matches.stream()
                .min(Comparator
                        .comparing((VehiculeRef v) -> !trimmed.equals(v.getCode()))
                        .thenComparingInt(v -> {
                            int idx = TYPE_PRIORITY.indexOf(v.getType());
                            return idx == -1 ? Integer.MAX_VALUE : idx;
                        }));
    }
}
