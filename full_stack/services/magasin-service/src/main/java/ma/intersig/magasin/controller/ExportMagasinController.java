package ma.intersig.magasin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import ma.intersig.magasin.exception.BusinessException;
import ma.intersig.magasin.service.ExportMagasinService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

@Tag(name = "Export magasin", description = "Excel export of fuel data and KPIs")
@RestController
@RequestMapping("/api/v1/magasin/export")
public class ExportMagasinController {

    private static final Logger log = LoggerFactory.getLogger(ExportMagasinController.class);
    private static final List<String> KNOWN_ENTITES = List.of("sorties", "arrivages", "jaugeages", "kpis");

    private final ExportMagasinService exportService;

    public ExportMagasinController(ExportMagasinService exportService) {
        this.exportService = exportService;
    }

    @Operation(summary = "Export fuel data (sorties, arrivages, jaugeages) and monthly KPIs to Excel")
    @GetMapping("/excel")
    @PreAuthorize("hasAnyRole('MAGASIN','ADMIN','FLEET_MANAGER')")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(value = "entites", required = false) List<String> entites,
            @RequestParam(value = "dateMin", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateMin,
            @RequestParam(value = "dateMax", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateMax,
            @RequestParam(value = "month", required = false) String month,
            @RequestParam(value = "columns", required = false) List<String> columns) {
        List<String> filtered = entites == null ? List.of()
                : entites.stream().filter(e -> e != null && KNOWN_ENTITES.contains(e)).toList();
        if (filtered.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        YearMonth ym;
        try {
            ym = (month == null || month.isBlank()) ? YearMonth.now() : YearMonth.parse(month.trim());
        } catch (DateTimeParseException e) {
            throw new BusinessException("Mois invalide (attendu YYYY-MM): " + month, "MONTH_INVALID", 400);
        }
        try {
            byte[] data = exportService.exportExcel(filtered, dateMin, dateMax, ym, columns);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"magasin-gasoil-export.xlsx\"")
                    .body(data);
        } catch (IOException e) {
            log.error("Failed to export magasin Excel entites={}", filtered, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
