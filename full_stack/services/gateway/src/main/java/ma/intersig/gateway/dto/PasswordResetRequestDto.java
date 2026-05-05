package ma.intersig.gateway.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;

public record PasswordResetRequestDto(
    @NotBlank @Email String email
) {}