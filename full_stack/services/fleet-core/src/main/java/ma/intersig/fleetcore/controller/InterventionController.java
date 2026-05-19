package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.dto.request.CreateInterventionRequest;
import ma.intersig.fleetcore.dto.response.InterventionDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.service.InterventionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@Tag(name = "Interventions", description = "Vehicle intervention tracking")
@Validated
@RestController
@RequestMapping("/api/v1")
public class InterventionController {

    private final InterventionService interventionService;

    public InterventionController(InterventionService interventionService) {
        this.interventionService = interventionService;
    }

    @Operation(summary = "List interventions with optional filters")
    @GetMapping("/interventions")
    public ResponseEntity<PageResponse<InterventionDto>> list(
            @RequestParam(required = false) Long vehicule_id,
            @RequestParam(required = false) String categorie,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) OffsetDateTime date_from,
            @RequestParam(required = false) OffsetDateTime date_to,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(interventionService.list(vehicule_id, categorie, statut, date_from, date_to, pageable));
    }

    @Operation(summary = "Create a new intervention")
    @PostMapping("/interventions")
    public ResponseEntity<InterventionDto> create(@Valid @RequestBody CreateInterventionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(interventionService.create(req));
    }

    @Operation(summary = "Get intervention by ID")
    @GetMapping("/interventions/{id}")
    public ResponseEntity<InterventionDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(interventionService.getById(id));
    }

    @Operation(summary = "Update an intervention")
    @PutMapping("/interventions/{id}")
    public ResponseEntity<InterventionDto> update(
            @PathVariable Long id,
            @Valid @RequestBody CreateInterventionRequest req) {
        return ResponseEntity.ok(interventionService.update(id, req));
    }

    @Operation(summary = "Close an intervention")
    @PatchMapping("/interventions/{id}/cloturer")
    public ResponseEntity<InterventionDto> cloturer(@PathVariable Long id) {
        return ResponseEntity.ok(interventionService.cloturer(id));
    }

    @Operation(summary = "List ongoing interventions")
    @GetMapping("/interventions/en-cours")
    public ResponseEntity<PageResponse<InterventionDto>> enCours(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(interventionService.enCours(pageable));
    }

    @Operation(summary = "Get most recent interventions")
    @GetMapping("/interventions/recentes")
    public ResponseEntity<List<InterventionDto>> recentes(
            @RequestParam(defaultValue = "5") @Min(1) @Max(100) int limit) {
        return ResponseEntity.ok(interventionService.recentes(limit));
    }

    @Operation(summary = "List interventions for a specific vehicle")
    @GetMapping("/vehicules/{id}/interventions")
    public ResponseEntity<PageResponse<InterventionDto>> listByVehicule(
            @PathVariable Long id,
            @RequestParam(required = false) String categorie,
            @RequestParam(required = false) String statut,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(interventionService.listByVehicule(id, categorie, statut, pageable));
    }
}