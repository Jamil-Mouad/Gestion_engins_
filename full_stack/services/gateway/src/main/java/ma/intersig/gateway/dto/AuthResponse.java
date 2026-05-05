package ma.intersig.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AuthResponse(
    @JsonProperty("access_token") String accessToken,
    @JsonProperty("refresh_token") String refreshToken,
    UserDto user
) {
    public record UserDto(
        Long id,
        String email,
        String prenom,
        String nom
    ) {}
}