package ma.intersig.gateway.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonProperty;

public record PasswordChangeRequest(
    @NotBlank @JsonProperty("current_password") String currentPassword,
    @NotBlank @Size(min = 8) @JsonProperty("new_password") String newPassword
) {}