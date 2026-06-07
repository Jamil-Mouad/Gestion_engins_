package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.service.ExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@Tag(name = "Export", description = "Excel data export")
@RestController
@RequestMapping("/api/v1/export")
public class ExportController {

    private static final Logger log = LoggerFactory.getLogger(ExportController.class);

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    @Operation(summary = "Export selected entities to Excel file")
    @GetMapping("/excel")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(value = "entites", required = false) List<String> entites,
            @RequestParam(value = "periode", required = false) String periode,
            @RequestParam(value = "vehiculeId", required = false) Long vehiculeId,
            @RequestParam(value = "vehiculeType", required = false) String vehiculeType) {
        List<String> filtered = entites == null ? List.of()
                : entites.stream().filter(e -> e != null && !e.isBlank()).toList();
        if (filtered.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            byte[] data = exportService.exportExcel(filtered, periode, vehiculeId, vehiculeType);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"fleettracker-export.xlsx\"")
                    .body(data);
        } catch (IOException e) {
            log.error("Failed to export Excel for periode={} entites={}", periode, filtered, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}