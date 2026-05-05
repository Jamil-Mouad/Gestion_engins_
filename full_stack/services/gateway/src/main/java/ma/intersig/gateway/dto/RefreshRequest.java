package ma.intersig.gateway.dto;

import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonProperty;

public record RefreshRequest(
    @NotBlank @JsonProperty("refresh_token") String refreshToken
) {}