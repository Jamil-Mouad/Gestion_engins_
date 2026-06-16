package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.dto.request.CreateVehiculeRequest;
import ma.intersig.fleetcore.dto.request.PatchVehiculeStatutRequest;
import ma.intersig.fleetcore.dto.request.UpdateVehiculeRequest;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.dto.response.VehiculeDto;
import ma.intersig.fleetcore.service.VehiculeFichePdfService;
import ma.intersig.fleetcore.service.VehiculeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Véhicules", description = "Fleet vehicle management")
@RestController
@RequestMapping("/api/v1/vehicules")
public class VehiculeController {

    private final VehiculeService vehiculeService;
    private final VehiculeFichePdfService vehiculeFichePdfService;

    public VehiculeController(VehiculeService vehiculeService,
                             VehiculeFichePdfService vehiculeFichePdfService) {
        this.vehiculeService = vehiculeService;
        this.vehiculeFichePdfService = vehiculeFichePdfService;
    }

    @Operation(summary = "List vehicles with optional filters")
    @GetMapping
    public ResponseEntity<PageResponse<VehiculeDto>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String statut,
            @PageableDefault(size = 20) Pageable pageable,
            HttpServletResponse response) {
        response.setHeader("Cache-Control", "public, max-age=15, must-revalidate");
        return ResponseEntity.ok(vehiculeService.list(q, type, statut, pageable));
    }

    @Operation(summary = "Get vehicle by ID")
    @GetMapping("/{id}")
    public ResponseEntity<VehiculeDto> getById(@PathVariable Long id, HttpServletResponse response) {
        response.setHeader("Cache-Control", "public, max-age=15, must-revalidate");
        return ResponseEntity.ok(vehiculeService.getById(id));
    }

    @Operation(summary = "Create a new vehicle")
    @PostMapping
    public ResponseEntity<VehiculeDto> create(@Valid @RequestBody CreateVehiculeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(vehiculeService.create(req));
    }

    @Operation(summary = "Update vehicle details")
    @PutMapping("/{id}")
    public ResponseEntity<VehiculeDto> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVehiculeRequest req) {
        return ResponseEntity.ok(vehiculeService.update(id, req));
    }

    @Operation(summary = "Update vehicle status")
    @PatchMapping("/{id}/statut")
    public ResponseEntity<VehiculeDto> patchStatut(
            @PathVariable Long id,
            @Valid @RequestBody PatchVehiculeStatutRequest req) {
        return ResponseEntity.ok(vehiculeService.patchStatut(id, req.statut()));
    }

    @Operation(summary = "Deactivate vehicle")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable Long id) {
        vehiculeService.softDelete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Download the printable « fiche véhicule » PDF")
    @GetMapping("/{id}/fiche.pdf")
    public ResponseEntity<byte[]> fichePdf(@PathVariable Long id) {
        byte[] pdf = vehiculeFichePdfService.generate(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"fiche-vehicule-" + id + ".pdf\"")
                .body(pdf);
    }
}