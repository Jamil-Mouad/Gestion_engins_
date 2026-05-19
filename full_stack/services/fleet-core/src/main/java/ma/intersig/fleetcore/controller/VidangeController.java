package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.dto.response.PlanningWeekDto;
import ma.intersig.fleetcore.dto.response.SuiviVidangeDto;
import ma.intersig.fleetcore.service.VidangeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Vidanges", description = "Oil change and maintenance tracking")
@RestController
@RequestMapping("/api/v1")
public class VidangeController {

    private final VidangeService vidangeService;

    public VidangeController(VidangeService vidangeService) {
        this.vidangeService = vidangeService;
    }

    @Operation(summary = "List oil change records with optional status filter")
    @GetMapping("/vidanges")
    public ResponseEntity<PageResponse<SuiviVidangeDto>> list(
            @RequestParam(required = false) String statut,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(vidangeService.list(statut, pageable));
    }

    @Operation(summary = "List oil changes for a specific vehicle")
    @GetMapping("/vehicules/{id}/vidanges")
    public ResponseEntity<List<SuiviVidangeDto>> listByVehicule(
            @PathVariable Long id,
            @RequestParam(required = false) String statut) {
        return ResponseEntity.ok(vidangeService.listByVehicule(id, statut));
    }

    @Operation(summary = "Close an oil change record")
    @PatchMapping("/vidanges/{id}/cloturer")
    public ResponseEntity<SuiviVidangeDto> cloturer(@PathVariable Long id) {
        return ResponseEntity.ok(vidangeService.cloturer(id));
    }

    @Operation(summary = "Get upcoming maintenance planning grouped by week")
    @GetMapping("/vidanges/planning")
    public ResponseEntity<List<PlanningWeekDto>> planning(
            @RequestParam(defaultValue = "4") int semaines) {
        return ResponseEntity.ok(vidangeService.planning(semaines));
    }
}