package ma.intersig.gateway.controller;

import jakarta.validation.Valid;
import ma.intersig.gateway.dto.PasswordResetConfirmDto;
import ma.intersig.gateway.dto.PasswordResetRequestDto;
import ma.intersig.gateway.dto.PasswordResetVerifyDto;
import ma.intersig.gateway.service.PasswordResetService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/password-reset")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestReset(@Valid @RequestBody PasswordResetRequestDto dto) {
        passwordResetService.requestReset(dto.email());
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, String>> verifyOtp(@Valid @RequestBody PasswordResetVerifyDto dto) {
        String token = passwordResetService.verifyOtp(dto.email(), dto.code());
        return ResponseEntity.ok(Map.of("reset_token", token));
    }

    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmReset(@Valid @RequestBody PasswordResetConfirmDto dto) {
        passwordResetService.confirmReset(dto);
    }
}
