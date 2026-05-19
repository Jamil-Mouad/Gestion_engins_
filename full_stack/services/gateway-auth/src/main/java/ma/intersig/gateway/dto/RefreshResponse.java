package ma.intersig.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record RefreshResponse(
    @JsonProperty("access_token") String accessToken
) {}