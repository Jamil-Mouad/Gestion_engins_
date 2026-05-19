package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.config.CurrentUserId;
import ma.intersig.fleetcore.dto.response.NotificationDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Notifications", description = "User notification management")
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Operation(summary = "List user notifications")
    @GetMapping
    public ResponseEntity<PageResponse<NotificationDto>> list(
            @RequestParam(required = false) Boolean lu,
            @PageableDefault(size = 20) Pageable pageable,
            @CurrentUserId Long userId) {
        return ResponseEntity.ok(notificationService.list(userId, lu, pageable));
    }

    @Operation(summary = "Count unread notifications")
    @GetMapping("/non-lues/count")
    public ResponseEntity<Map<String, Integer>> countUnread(@CurrentUserId Long userId) {
        return ResponseEntity.ok(notificationService.countUnread(userId));
    }

    @Operation(summary = "Get critical unread notifications")
    @GetMapping("/critiques")
    public ResponseEntity<List<NotificationDto>> getCritiques(
            @RequestParam(defaultValue = "5") int limit,
            @CurrentUserId Long userId) {
        return ResponseEntity.ok(notificationService.getCritiques(userId, limit));
    }

    @Operation(summary = "Mark a notification as read")
    @PatchMapping("/{id}/marquer-lue")
    public ResponseEntity<NotificationDto> marquerLue(
            @PathVariable Long id,
            @CurrentUserId Long userId) {
        return ResponseEntity.ok(notificationService.marquerLue(id, userId));
    }

    @Operation(summary = "Mark all notifications as read")
    @PatchMapping("/lire-tout")
    public ResponseEntity<Map<String, Integer>> marquerToutLue(@CurrentUserId Long userId) {
        return ResponseEntity.ok(notificationService.marquerToutLue(userId));
    }

    @Operation(summary = "Get notification preferences config")
    @GetMapping("/config")
    public ResponseEntity<String> getConfig(@CurrentUserId Long userId) {
        String config = notificationService.getConfig(userId);
        return ResponseEntity.ok(config != null ? config : "{}");
    }

    @Operation(summary = "Save notification preferences config")
    @PutMapping("/config")
    public ResponseEntity<Void> saveConfig(
            @RequestBody String jsonb,
            @CurrentUserId Long userId) {
        try {
            new com.fasterxml.jackson.databind.ObjectMapper().readTree(jsonb);
        } catch (Exception e) {
            throw new ma.intersig.fleetcore.exception.BusinessException(
                    "Invalid JSON: " + e.getMessage(), "INVALID_JSON", 400);
        }
        notificationService.saveConfig(userId, jsonb);
        return ResponseEntity.noContent().build();
    }
}