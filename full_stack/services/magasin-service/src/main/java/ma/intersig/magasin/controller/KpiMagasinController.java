package ma.intersig.magasin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import ma.intersig.magasin.dto.response.DashboardKpiDto;
import ma.intersig.magasin.dto.response.VehiculeKpiDto;
import ma.intersig.magasin.exception.BusinessException;
import ma.intersig.magasin.service.KpiMagasinService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;

@Tag(name = "KPIs magasin", description = "Fuel stock and consumption indicators")
@RestController
@RequestMapping("/api/v1/magasin/kpis")
public class KpiMagasinController {

    private final KpiMagasinService kpiService;

    public KpiMagasinController(KpiMagasinService kpiService) {
        this.kpiService = kpiService;
    }

    @Operation(summary = "Dashboard KPIs: stock, écart jauge, conso, autonomie, top consommateurs")
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<DashboardKpiDto> dashboard(
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(kpiService.dashboard(parseMonth(month)));
    }

    @Operation(summary = "Per-vehicle fuel KPIs (voyages, km, conso, % vs flotte) by vehicle code")
    @GetMapping("/vehicule")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<VehiculeKpiDto> vehicule(
            @RequestParam String code,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(kpiService.vehicule(code, type, parseMonth(month)));
    }

    private YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            return YearMonth.now();
        }
        try {
            return YearMonth.parse(month.trim());
        } catch (DateTimeParseException e) {
            throw new BusinessException("Mois invalide (attendu YYYY-MM): " + month, "MONTH_INVALID", 400);
        }
    }
}
