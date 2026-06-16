package ma.intersig.fleetcore.dto.response;

import ma.intersig.fleetcore.entity.User;

public record UserRefDto(Long id, String prenom, String nom) {
    public static UserRefDto from(User u) {
        if (u == null) return null;
        return new UserRefDto(u.getId(), u.getPrenom(), u.getNom());
    }
}
