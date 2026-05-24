package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.dto.request.CreateComposantRequest;
import ma.intersig.fleetcore.dto.response.ComposantDto;
import ma.intersig.fleetcore.service.ComposantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Composants", description = "Fleet component catalog management")
@RestController
@RequestMapping("/api/v1/composants")
public class ComposantController {

    private final ComposantService composantService;

    public ComposantController(ComposantService composantService) {
        this.composantService = composantService;
    }

    @Operation(summary = "Get component hierarchy tree")
    @GetMapping("/tree")
    public ResponseEntity<List<ComposantDto>> getTree(HttpServletResponse response) {
        response.setHeader("Cache-Control", "public, max-age=300");
        return ResponseEntity.ok(composantService.getTree());
    }

    @Operation(summary = "Search components by name or reference")
    @GetMapping("/search")
    public ResponseEntity<List<ComposantDto>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String categorie) {
        return ResponseEntity.ok(composantService.search(q, categorie));
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
}