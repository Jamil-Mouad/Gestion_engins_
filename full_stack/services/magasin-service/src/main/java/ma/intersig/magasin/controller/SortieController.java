package ma.intersig.magasin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import ma.intersig.magasin.config.CurrentUserId;
import ma.intersig.magasin.dto.request.SortieRequest;
import ma.intersig.magasin.dto.response.LastTotaliseurDto;
import ma.intersig.magasin.dto.response.PageResponse;
import ma.intersig.magasin.dto.response.SortieDto;
import ma.intersig.magasin.dto.response.VehiculeSuggestDto;
import ma.intersig.magasin.service.SortieService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Sorties carburant", description = "Fuel dispensings (bons de sortie)")
@RestController
@RequestMapping("/api/v1/magasin")
public class SortieController {

    private final SortieService sortieService;

    public SortieController(SortieService sortieService) {
        this.sortieService = sortieService;
    }

    @Operation(summary = "List fuel dispensings (paged; filters: date range, vehicle code, free search)")
    @GetMapping("/sorties")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<PageResponse<SortieDto>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateMin,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateMax,
            @RequestParam(required = false) String vehiculeCode,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = {"dateSortie", "id"}, direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(sortieService.list(dateMin, dateMax, vehiculeCode, search, pageable)));
    }

    @Operation(summary = "Last recorded pump totalizer (the form derives the quantity from it)")
    @GetMapping("/sorties/last-totaliseur")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<LastTotaliseurDto> lastTotaliseur() {
        return ResponseEntity.ok(sortieService.lastTotaliseur());
    }

    @Operation(summary = "Record a fuel dispensing")
    @PostMapping("/sorties")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<SortieDto> create(@Valid @RequestBody SortieRequest req,
                                            @CurrentUserId Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sortieService.create(req, userId));
    }

    @Operation(summary = "Update a fuel dispensing")
    @PutMapping("/sorties/{id}")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<SortieDto> update(@PathVariable Long id, @Valid @RequestBody SortieRequest req) {
        return ResponseEntity.ok(sortieService.update(id, req));
    }

    @Operation(summary = "Delete a fuel dispensing")
    @DeleteMapping("/sorties/{id}")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        sortieService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Autocomplete vehicles by code/marque/matricule")
    @GetMapping("/vehicules/suggest")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<List<VehiculeSuggestDto>> suggestVehicules(@RequestParam("q") String q) {
        return ResponseEntity.ok(sortieService.suggestVehicules(q));
    }

    @Operation(summary = "Autocomplete past free-text destinations")
    @GetMapping("/destinations/suggest")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<List<String>> suggestDestinations(@RequestParam("q") String q) {
        return ResponseEntity.ok(sortieService.suggestDestinations(q));
    }
}
