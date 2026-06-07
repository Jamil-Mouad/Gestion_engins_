package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.config.CurrentUserId;
import ma.intersig.fleetcore.dto.request.CreateInspectionRequest;
import ma.intersig.fleetcore.dto.request.CreatePneuRequest;
import ma.intersig.fleetcore.dto.request.PermuterPneuRequest;
import ma.intersig.fleetcore.dto.request.RemplacerPneuRequest;
import ma.intersig.fleetcore.dto.request.RemonterPneuRequest;
import ma.intersig.fleetcore.dto.request.UpdatePneuRequest;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.dto.response.PneuDto;
import ma.intersig.fleetcore.dto.response.PneuInspectionDto;
import ma.intersig.fleetcore.service.PneuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Pneus", description = "Tire management and inspection tracking")
@RestController
@RequestMapping("/api/v1")
public class PneuController {

    private final PneuService pneuService;

    public PneuController(PneuService pneuService) {
        this.pneuService = pneuService;
    }

    @Operation(summary = "Assign a tire to a vehicle")
    @PostMapping("/vehicules/{id}/pneus")
    public ResponseEntity<PneuDto> assign(@PathVariable Long id,
                                          @Valid @RequestBody CreatePneuRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pneuService.assign(id, req));
    }

    @Operation(summary = "List all tires")
    @GetMapping("/pneus")
    public ResponseEntity<List<PneuDto>> listAll() {
        return ResponseEntity.ok(pneuService.listAll());
    }

    @Operation(summary = "List tires available for remounting (soft-deleted)")
    @GetMapping("/pneus/available")
    public ResponseEntity<List<PneuDto>> listAvailable() {
        return ResponseEntity.ok(pneuService.listAvailable());
    }

    @Operation(summary = "Get tire by ID")
    @GetMapping("/pneus/{id}")
    public ResponseEntity<PneuDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(pneuService.getById(id));
    }

    @Operation(summary = "List tires for a specific vehicle")
    @GetMapping("/vehicules/{id}/pneus")
    public ResponseEntity<List<PneuDto>> listByVehicule(@PathVariable Long id) {
        return ResponseEntity.ok(pneuService.listByVehicule(id));
    }

    @Operation(summary = "Update tire fields (nSerie, marque, dateMontage, expectedLifeKm, pression, profondeur)")
    @PatchMapping("/pneus/{id}")
    public ResponseEntity<PneuDto> update(@PathVariable Long id,
                                          @Valid @RequestBody UpdatePneuRequest req) {
        return ResponseEntity.ok(pneuService.update(id, req));
    }

    @Operation(summary = "Swap two tires between positions")
    @PatchMapping("/pneus/{id}/permuter")
    public ResponseEntity<Map<String, PneuDto>> permuter(@PathVariable Long id,
                                                          @Valid @RequestBody PermuterPneuRequest req) {
        return ResponseEntity.ok(pneuService.permuter(id, req));
    }

    @Operation(summary = "Replace a tire")
    @PatchMapping("/pneus/{id}/remplacer")
    public ResponseEntity<PneuDto> remplacer(@PathVariable Long id,
                                             @Valid @RequestBody RemplacerPneuRequest req) {
        return ResponseEntity.ok(pneuService.remplacer(id, req));
    }

    @Operation(summary = "Remount a previously removed tire at a new position")
    @PatchMapping("/pneus/{id}/remonter")
    public ResponseEntity<PneuDto> remonter(@PathVariable Long id,
                                             @Valid @RequestBody RemonterPneuRequest req) {
        return ResponseEntity.ok(pneuService.remonter(id, req));
    }

    @Operation(summary = "List tires with wear alerts")
    @GetMapping("/pneus/alertes")
    public ResponseEntity<List<PneuDto>> alertes() {
        return ResponseEntity.ok(pneuService.alertes());
    }

    @Operation(summary = "List inspections for a tire")
    @GetMapping("/pneus/{id}/inspections")
    public ResponseEntity<PageResponse<PneuInspectionDto>> listInspections(
            @PathVariable Long id,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(pneuService.listInspections(id, pageable));
    }

    @Operation(summary = "Log a tire inspection")
    @PostMapping("/pneus/{id}/inspections")
    public ResponseEntity<PneuDto> logInspection(@PathVariable Long id,
                                                  @CurrentUserId Long userId,
                                                  @Valid @RequestBody CreateInspectionRequest req) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(pneuService.logInspection(id, userId, req));
    }

    @Operation(summary = "Get activity log for a tire")
    @GetMapping("/pneus/{id}/activity-log")
    public ResponseEntity<List<PneuInspectionDto>> activityLog(@PathVariable Long id) {
        return ResponseEntity.ok(pneuService.listActivityLog(id));
    }

    @Operation(summary = "Soft-delete (deactivate) a tire")
    @DeleteMapping("/pneus/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable Long id) {
        pneuService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}