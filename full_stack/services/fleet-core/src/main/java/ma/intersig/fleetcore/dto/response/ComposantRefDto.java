package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.Composant;

public record ComposantRefDto(Long id, String designation) {
    public static ComposantRefDto from(Composant c) {
        if (c == null) return null;
        return new ComposantRefDto(c.getId(), c.getDesignation());
    }
}
