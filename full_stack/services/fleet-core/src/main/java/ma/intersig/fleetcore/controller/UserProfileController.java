package ma.intersig.fleetcore.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.intersig.fleetcore.config.CurrentUserId;
import ma.intersig.fleetcore.dto.response.ErrorEnvelope;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User Profile", description = "User profile and preferences")
@RestController
@RequestMapping("/api/v1/users")
public class UserProfileController {

    private final UserService userService;

    public UserProfileController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe(@CurrentUserId Long userId) {
        User user = userService.getMe(userId);
        return ResponseEntity.ok(new UserDto(
                user.getId(),
                user.getEmail(),
                user.getPrenom(),
                user.getNom(),
                user.getActif()
        ));
    }

    @PutMapping("/me")
    public ResponseEntity<UserDto> updateMe(@CurrentUserId Long userId,
                                             @Valid @RequestBody UpdateUserRequest req) {
        User user = userService.updateMe(userId, req.prenom(), req.nom());
        return ResponseEntity.ok(new UserDto(
                user.getId(),
                user.getEmail(),
                user.getPrenom(),
                user.getNom(),
                user.getActif()
        ));
    }

    @GetMapping("/me/dashboard-config")
    public ResponseEntity<String> getDashboardConfig(@CurrentUserId Long userId) {
        String config = userService.getDashboardConfig(userId);
        return ResponseEntity.ok(config != null ? config : "{}");
    }

    @PutMapping("/me/dashboard-config")
    public ResponseEntity<String> saveDashboardConfig(@CurrentUserId Long userId,
                                                       @RequestBody String jsonb) {
        validateJson(jsonb);
        userService.saveDashboardConfig(userId, jsonb);
        return ResponseEntity.ok(jsonb);
    }

    @GetMapping("/me/preferences-notifications")
    public ResponseEntity<String> getPreferencesNotifications(@CurrentUserId Long userId) {
        String prefs = userService.getPreferencesNotifications(userId);
        return ResponseEntity.ok(prefs != null ? prefs : "{}");
    }

    @PutMapping("/me/preferences-notifications")
    public ResponseEntity<String> savePreferencesNotifications(@CurrentUserId Long userId,
                                                                @RequestBody String jsonb) {
        validateJson(jsonb);
        userService.savePreferencesNotifications(userId, jsonb);
        return ResponseEntity.ok(jsonb);
    }

    private void validateJson(String json) {
        try {
            new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
        } catch (Exception e) {
            throw new ma.intersig.fleetcore.exception.BusinessException(
                    "Invalid JSON: " + e.getMessage(), "INVALID_JSON", 400);
        }
    }

    public record UpdateUserRequest(@NotBlank String prenom, @NotBlank String nom) {}

    public record UserDto(Long id, String email, String prenom, String nom, Boolean actif) {}
}