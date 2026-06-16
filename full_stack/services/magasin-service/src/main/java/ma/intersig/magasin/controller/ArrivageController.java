package ma.intersig.magasin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import ma.intersig.magasin.config.CurrentUserId;
import ma.intersig.magasin.dto.request.ArrivageRequest;
import ma.intersig.magasin.dto.response.ArrivageDto;
import ma.intersig.magasin.dto.response.PageResponse;
import ma.intersig.magasin.service.ArrivageService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "Arrivages", description = "Fuel deliveries to the tank")
@RestController
@RequestMapping("/api/v1/magasin/arrivages")
public class ArrivageController {

    private final ArrivageService arrivageService;

    public ArrivageController(ArrivageService arrivageService) {
        this.arrivageService = arrivageService;
    }

    @Operation(summary = "List fuel deliveries (paged, optional date range)")
    @GetMapping
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<PageResponse<ArrivageDto>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateMin,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateMax,
            @PageableDefault(size = 20, sort = "dateArrivage", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(arrivageService.list(dateMin, dateMax, pageable)));
    }

    @Operation(summary = "Record a fuel delivery")
    @PostMapping
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<ArrivageDto> create(@Valid @RequestBody ArrivageRequest req,
                                              @CurrentUserId Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(arrivageService.create(req, userId));
    }

    @Operation(summary = "Update a fuel delivery")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<ArrivageDto> update(@PathVariable Long id, @Valid @RequestBody ArrivageRequest req) {
        return ResponseEntity.ok(arrivageService.update(id, req));
    }

    @Operation(summary = "Delete a fuel delivery")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        arrivageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
