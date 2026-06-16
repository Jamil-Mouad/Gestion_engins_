package ma.intersig.fleetcore.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.intersig.fleetcore.config.CurrentUserId;
import ma.intersig.fleetcore.dto.report.ImportReportDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.entity.ImportsHistorique;
import ma.intersig.fleetcore.service.ImportService;
import ma.intersig.fleetcore.service.ReleveCompteurService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;

@Tag(name = "Import", description = "Excel data import endpoints")
@RestController
@RequestMapping("/api/v1/import")
public class ImportController {

    private final ImportService importService;
    private final ReleveCompteurService releveCompteurService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ImportController(ImportService importService,
                             ReleveCompteurService releveCompteurService) {
        this.importService = importService;
        this.releveCompteurService = releveCompteurService;
    }

    @Operation(summary = "Import vehicles or composants from Excel file")
    @PostMapping("/excel")
    public ResponseEntity<ImportReportDto> importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mapping", required = false) String mappingJson,
            @RequestParam("entite") String entite,
            @CurrentUserId Long userId) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Map<Integer, String> mapping = (mappingJson != null && !mappingJson.isBlank())
                ? parseMapping(mappingJson)
                : null;
        ImportReportDto report = importService.importGeneral(file, mapping, entite, userId);
        return ResponseEntity.ok(report);
    }

    @Operation(summary = "Get available fields for an entity import")
    @GetMapping("/excel/fields")
    public ResponseEntity<Map<String, Object>> getFields(@RequestParam("entite") String entite) {
        return ResponseEntity.ok(importService.getFields(entite));
    }

    @Operation(summary = "Import odometer readings from Excel file")
    @PostMapping("/releves-compteurs")
    public ResponseEntity<ImportReportDto> importReleves(
            @RequestParam("file") MultipartFile file,
            @CurrentUserId Long userId) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        ImportReportDto report = releveCompteurService.importExcel(file, userId);
        return ResponseEntity.ok(report);
    }

    @Operation(summary = "Get import history")
    @GetMapping("/historique")
    public ResponseEntity<PageResponse<ImportsHistorique>> getHistorique(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(importService.getHistorique(pageable));
    }

    private Map<Integer, String> parseMapping(String mappingJson) {
        try {
            Map<String, String> raw = objectMapper.readValue(mappingJson, new TypeReference<>() {});
            Map<Integer, String> result = new LinkedHashMap<>();
            for (Map.Entry<String, String> entry : raw.entrySet()) {
                try {
                    result.put(Integer.parseInt(entry.getKey()), entry.getValue());
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Invalid mapping key (must be integer): " + entry.getKey());
                }
            }
            return result;
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid mapping JSON: " + e.getMessage());
        }
    }
}
