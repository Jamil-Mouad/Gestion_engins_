package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.config.CurrentUserId;
import ma.intersig.fleetcore.dto.request.CreateReleveRequest;
import ma.intersig.fleetcore.dto.response.ReleveCompteurDto;
import ma.intersig.fleetcore.service.ReleveCompteurService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Relevés Compteur", description = "Odometer and hour meter readings")
@RestController
@RequestMapping("/api/v1")
public class ReleveCompteurController {

    private final ReleveCompteurService releveService;

    public ReleveCompteurController(ReleveCompteurService releveService) {
        this.releveService = releveService;
    }

    @Operation(summary = "Record an odometer or hour meter reading")
    @PostMapping("/releves-compteur")
    public ResponseEntity<ReleveCompteurDto> create(
            @Valid @RequestBody CreateReleveRequest req,
            @CurrentUserId Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(releveService.create(req, userId));
    }
}