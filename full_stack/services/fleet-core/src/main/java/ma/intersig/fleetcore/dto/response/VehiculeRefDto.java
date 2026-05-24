package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Vehicule;

public record VehiculeRefDto(Long id, String code) {
    public static VehiculeRefDto from(Vehicule v) {
        if (v == null) return null;
        return new VehiculeRefDto(v.getId(), v.getCode());
    }
}
