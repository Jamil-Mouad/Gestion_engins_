package ma.intersig.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmDto(
    @NotBlank @Email String email,
    @NotBlank @JsonProperty("reset_token") String resetToken,
    @NotBlank @Size(min = 8, max = 72) @JsonProperty("new_password") String newPassword
) {}