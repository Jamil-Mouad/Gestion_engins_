package ma.intersig.magasin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import ma.intersig.magasin.config.CurrentUserId;
import ma.intersig.magasin.dto.request.JaugeageRequest;
import ma.intersig.magasin.dto.response.JaugeageDto;
import ma.intersig.magasin.dto.response.PageResponse;
import ma.intersig.magasin.service.JaugeageService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Jaugeages", description = "Daily ruler measurements of the tank level")
@RestController
@RequestMapping("/api/v1/magasin/jaugeages")
public class JaugeageController {

    private final JaugeageService jaugeageService;

    public JaugeageController(JaugeageService jaugeageService) {
        this.jaugeageService = jaugeageService;
    }

    @Operation(summary = "List daily gaugings (paged, most recent first)")
    @GetMapping
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<PageResponse<JaugeageDto>> list(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(jaugeageService.list(pageable)));
    }

    @Operation(summary = "Record a daily gauging (server converts cm → liters and freezes the écart)")
    @PostMapping
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<JaugeageDto> create(@Valid @RequestBody JaugeageRequest req,
                                              @CurrentUserId Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jaugeageService.create(req, userId));
    }

    @Operation(summary = "Delete a gauging")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        jaugeageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
