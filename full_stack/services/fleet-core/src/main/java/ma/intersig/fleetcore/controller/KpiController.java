package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.dto.response.KpiCostHistoryDto;
import ma.intersig.fleetcore.dto.response.KpiCoutsBreakdownDto;
import ma.intersig.fleetcore.dto.response.KpiDto;
import ma.intersig.fleetcore.dto.response.KpiInterventionByStatusDto;
import ma.intersig.fleetcore.dto.response.KpiTimeseriesPointDto;
import ma.intersig.fleetcore.service.KpiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "KPIs", description = "Fleet key performance indicators")
@RestController
@RequestMapping("/api/v1")
public class KpiController {

    private final KpiService kpiService;

    public KpiController(KpiService kpiService) {
        this.kpiService = kpiService;
    }

    @Operation(summary = "Get headline KPIs")
    @GetMapping("/kpis")
    public ResponseEntity<KpiDto> getKpis(HttpServletResponse response) {
        String lastRefresh = kpiService.getLastRefresh();
        response.setHeader("X-KPI-Last-Refresh", lastRefresh != null ? lastRefresh : "never");
        response.setHeader("Cache-Control", "private, max-age=60");
        return ResponseEntity.ok(kpiService.getHeadline());
    }

    @Operation(summary = "Get availability timeseries by month")
    @GetMapping("/kpis/disponibilite/timeseries")
    public ResponseEntity<List<KpiTimeseriesPointDto>> getTimeseries(
            @RequestParam(defaultValue = "12") int mois,
            HttpServletResponse response) {
        String lastRefresh = kpiService.getLastRefresh();
        response.setHeader("X-KPI-Last-Refresh", lastRefresh != null ? lastRefresh : "never");
        response.setHeader("Cache-Control", "private, max-age=60");
        return ResponseEntity.ok(kpiService.getTimeseries(mois));
    }

    @Operation(summary = "Get maintenance cost breakdown by category")
    @GetMapping("/kpis/couts/breakdown")
    public ResponseEntity<KpiCoutsBreakdownDto> getCoutsBreakdown(HttpServletResponse response) {
        String lastRefresh = kpiService.getLastRefresh();
        response.setHeader("X-KPI-Last-Refresh", lastRefresh != null ? lastRefresh : "never");
        response.setHeader("Cache-Control", "private, max-age=60");
        return ResponseEntity.ok(kpiService.getCoutsBreakdown());
    }

    @Operation(summary = "Get maintenance cost history by month")
    @GetMapping("/kpis/cost-history")
    public ResponseEntity<List<KpiCostHistoryDto>> getCostHistory(
            @RequestParam(defaultValue = "12") int months,
            HttpServletResponse response) {
        response.setHeader("Cache-Control", "private, max-age=60");
        return ResponseEntity.ok(kpiService.getCostHistory(months));
    }

    @Operation(summary = "Get intervention count by status")
    @GetMapping("/kpis/interventions-by-status")
    public ResponseEntity<List<KpiInterventionByStatusDto>> getInterventionsByStatus(
            HttpServletResponse response) {
        response.setHeader("Cache-Control", "private, max-age=60");
        return ResponseEntity.ok(kpiService.getInterventionsByStatus());
    }

    @Operation(summary = "Get KPIs for a specific vehicle")
    @GetMapping("/vehicules/{id}/kpis")
    public ResponseEntity<KpiDto> getVehiculeKpis(@PathVariable Long id,
                                                    HttpServletResponse response) {
        String lastRefresh = kpiService.getLastRefresh();
        response.setHeader("X-KPI-Last-Refresh", lastRefresh != null ? lastRefresh : "never");
        response.setHeader("Cache-Control", "private, max-age=60");
        return ResponseEntity.ok(kpiService.getVehiculeKpis(id));
    }
}
