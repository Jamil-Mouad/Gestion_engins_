package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.config.CurrentUserId;
import ma.intersig.fleetcore.dto.request.CreateDemandeAchatRequest;
import ma.intersig.fleetcore.dto.request.RejeterDemandeRequest;
import ma.intersig.fleetcore.dto.response.DemandeAchatDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.service.DemandeAchatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@Tag(name = "Demandes d'achat", description = "Purchase request management")
@RestController
@RequestMapping("/api/v1/demandes-achat")
public class DemandeAchatController {

    private final DemandeAchatService demandeAchatService;

    public DemandeAchatController(DemandeAchatService demandeAchatService) {
        this.demandeAchatService = demandeAchatService;
    }

    @Operation(summary = "List purchase requests")
    @GetMapping
    public ResponseEntity<PageResponse<DemandeAchatDto>> list(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String urgence,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "dateDemande", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(demandeAchatService.list(statut, urgence, q, pageable));
    }

    @Operation(summary = "Create a purchase request")
    @PostMapping
    public ResponseEntity<DemandeAchatDto> create(
            @Valid @RequestBody CreateDemandeAchatRequest req,
            @CurrentUserId Long userId) {
        return ResponseEntity.status(201).body(demandeAchatService.create(req, userId));
    }

    @Operation(summary = "Get purchase request by ID")
    @GetMapping("/{id}")
    public ResponseEntity<DemandeAchatDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(demandeAchatService.getById(id));
    }

    @Operation(summary = "Approve a purchase request")
    @PatchMapping("/{id}/approuver")
    public ResponseEntity<DemandeAchatDto> approuver(
            @PathVariable Long id,
            @CurrentUserId Long userId) {
        return ResponseEntity.ok(demandeAchatService.approuver(id, userId));
    }

    @Operation(summary = "Reject a purchase request")
    @PatchMapping("/{id}/rejeter")
    public ResponseEntity<DemandeAchatDto> rejeter(
            @PathVariable Long id,
            @Valid @RequestBody RejeterDemandeRequest req,
            @CurrentUserId Long userId) {
        return ResponseEntity.ok(demandeAchatService.rejeter(id, req.raison(), userId));
    }

    @Operation(summary = "Close an approved purchase request")
    @PatchMapping("/{id}/cloturer")
    public ResponseEntity<DemandeAchatDto> cloturer(@PathVariable Long id) {
        return ResponseEntity.ok(demandeAchatService.cloturer(id));
    }
}