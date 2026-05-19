package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.dto.request.CreateFournisseurRequest;
import ma.intersig.fleetcore.dto.response.FournisseurDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.service.FournisseurService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@Tag(name = "Fournisseurs", description = "Supplier management")
@RestController
@RequestMapping("/api/v1/fournisseurs")
public class FournisseurController {

    private final FournisseurService fournisseurService;

    public FournisseurController(FournisseurService fournisseurService) {
        this.fournisseurService = fournisseurService;
    }

    @Operation(summary = "List active suppliers")
    @GetMapping
    public ResponseEntity<PageResponse<FournisseurDto>> list(
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(fournisseurService.list(q, pageable));
    }

    @Operation(summary = "Get supplier by ID")
    @GetMapping("/{id}")
    public ResponseEntity<FournisseurDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(fournisseurService.getById(id));
    }

    @Operation(summary = "Create a new supplier")
    @PostMapping
    public ResponseEntity<FournisseurDto> create(@Valid @RequestBody CreateFournisseurRequest req) {
        return ResponseEntity.status(201).body(fournisseurService.create(req));
    }

    @Operation(summary = "Update supplier details")
    @PutMapping("/{id}")
    public ResponseEntity<FournisseurDto> update(
            @PathVariable Long id,
            @Valid @RequestBody CreateFournisseurRequest req) {
        return ResponseEntity.ok(fournisseurService.update(id, req));
    }

    @Operation(summary = "Deactivate a supplier")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable Long id) {
        fournisseurService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}