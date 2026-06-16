package ma.intersig.fleetcore.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import ma.intersig.fleetcore.config.CurrentUserId;
import ma.intersig.fleetcore.dto.request.CreateReleveRequest;
import ma.intersig.fleetcore.dto.response.ReleveCompteurDto;
import ma.intersig.fleetcore.service.ReleveCompteurService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Tag(name = "Relevés compteur", description = "Vehicle odometer/hour readings")
@RestController
@RequestMapping("/api/v1/releves")
public class ReleveController {

    private final ReleveCompteurService releveCompteurService;

    public ReleveController(ReleveCompteurService releveCompteurService) {
        this.releveCompteurService = releveCompteurService;
    }

    @Operation(summary = "Record a single odometer/hour reading (cascades tyre km + service tracking)")
    @PostMapping
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<ReleveCompteurDto> create(@Valid @RequestBody CreateReleveRequest req,
                                                    @CurrentUserId Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(releveCompteurService.create(req, userId));
    }

    @Operation(summary = "List a vehicle's readings (most recent first)")
    @GetMapping("/vehicule/{vehiculeId}")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<List<ReleveCompteurDto>> listByVehicule(@PathVariable Long vehiculeId) {
        return ResponseEntity.ok(releveCompteurService.listByVehicule(vehiculeId));
    }
}
