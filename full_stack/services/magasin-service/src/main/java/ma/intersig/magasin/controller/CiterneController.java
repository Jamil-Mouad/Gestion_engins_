package ma.intersig.magasin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import ma.intersig.magasin.dto.request.BaremeUpdateRequest;
import ma.intersig.magasin.dto.request.CiterneUpdateRequest;
import ma.intersig.magasin.dto.response.BaremeRowDto;
import ma.intersig.magasin.dto.response.CiterneDto;
import ma.intersig.magasin.dto.response.ConversionDto;
import ma.intersig.magasin.service.CiterneService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@Tag(name = "Citerne", description = "Tank configuration and gauging calibration (barème)")
@RestController
@RequestMapping("/api/v1/magasin")
public class CiterneController {

    private final CiterneService citerneService;

    public CiterneController(CiterneService citerneService) {
        this.citerneService = citerneService;
    }

    @Operation(summary = "Get the active tank configuration")
    @GetMapping("/citerne")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<CiterneDto> get() {
        return ResponseEntity.ok(citerneService.get());
    }

    @Operation(summary = "Update the tank configuration (capacity, density, initial stock)")
    @PutMapping("/citerne")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<CiterneDto> update(@Valid @RequestBody CiterneUpdateRequest req) {
        return ResponseEntity.ok(citerneService.update(req));
    }

    @Operation(summary = "Get the gauging calibration table (cm → liters)")
    @GetMapping("/citerne/bareme")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<List<BaremeRowDto>> getBareme() {
        return ResponseEntity.ok(citerneService.getBareme());
    }

    @Operation(summary = "Replace the gauging calibration table")
    @PutMapping("/citerne/bareme")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN')")
    public ResponseEntity<List<BaremeRowDto>> replaceBareme(@Valid @RequestBody BaremeUpdateRequest req) {
        return ResponseEntity.ok(citerneService.replaceBareme(req));
    }

    @Operation(summary = "Convert a ruler height (cm) to liters via the calibration table")
    @GetMapping("/citerne/conversion")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<ConversionDto> convert(@RequestParam("hauteurCm") BigDecimal hauteurCm) {
        return ResponseEntity.ok(citerneService.preview(hauteurCm));
    }
}
