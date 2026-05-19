package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.dto.response.HistoriqueItemDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.service.HistoriqueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;

@Tag(name = "Historique", description = "Unified vehicle activity history")
@RestController
@RequestMapping("/api/v1")
public class HistoriqueController {

    private final HistoriqueService historiqueService;

    public HistoriqueController(HistoriqueService historiqueService) {
        this.historiqueService = historiqueService;
    }

    @Operation(summary = "Get unified activity history with optional filters")
    @GetMapping("/historique")
    public ResponseEntity<PageResponse<HistoriqueItemDto>> list(
            @RequestParam(required = false) Long vehicule_id,
            @RequestParam(required = false) OffsetDateTime date_from,
            @RequestParam(required = false) OffsetDateTime date_to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String partie,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(historiqueService.list(vehicule_id, date_from, date_to, type, partie, pageable));
    }
}