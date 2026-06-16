package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.dto.request.CreateComposantRequest;
import ma.intersig.fleetcore.dto.response.ComposantDto;
import ma.intersig.fleetcore.service.ComposantFichePdfService;
import ma.intersig.fleetcore.service.ComposantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Composants", description = "Fleet component catalog management")
@RestController
@RequestMapping("/api/v1/composants")
public class ComposantController {

    private final ComposantService composantService;
    private final ComposantFichePdfService composantFichePdfService;

    public ComposantController(ComposantService composantService,
                              ComposantFichePdfService composantFichePdfService) {
        this.composantService = composantService;
        this.composantFichePdfService = composantFichePdfService;
    }

    @Operation(summary = "Get a vehicle's composant tree (vehiculeId) or the per-type template tree")
    @GetMapping("/tree")
    public ResponseEntity<List<ComposantDto>> getTree(
            @RequestParam(required = false) Long vehiculeId,
            @RequestParam(required = false) String type,
            HttpServletResponse response) {
        // no-cache (not max-age): the browser must revalidate with the ETag on
        // every load, otherwise create/delete mutations show a stale tree for
        // minutes. Server-side freshness is handled by the Caffeine cache.
        response.setHeader("Cache-Control", "no-cache");
        return ResponseEntity.ok(composantService.getTree(vehiculeId, type));
    }

    @Operation(summary = "Search components by name or reference")
    @GetMapping("/search")
    public ResponseEntity<List<ComposantDto>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String categorie,
            @RequestParam(required = false) Long vehiculeId) {
        return ResponseEntity.ok(composantService.search(q, categorie, vehiculeId));
    }

    @Operation(summary = "List all component categories")
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(composantService.getCategories());
    }

    @Operation(summary = "Get component by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ComposantDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(composantService.getById(id));
    }

    @Operation(summary = "Create a new component")
    @PostMapping
    public ResponseEntity<ComposantDto> create(@Valid @RequestBody CreateComposantRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(composantService.create(req));
    }

    @Operation(summary = "Update a component")
    @PutMapping("/{id}")
    public ResponseEntity<ComposantDto> update(@PathVariable Long id,
                                                @Valid @RequestBody CreateComposantRequest req) {
        return ResponseEntity.ok(composantService.update(id, req));
    }

    @Operation(summary = "Delete a component")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        composantService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Download the printable « fiche composant » PDF")
    @GetMapping("/{id}/fiche.pdf")
    public ResponseEntity<byte[]> fichePdf(@PathVariable Long id) {
        byte[] pdf = composantFichePdfService.generate(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"fiche-composant-" + id + ".pdf\"")
                .body(pdf);
    }
}