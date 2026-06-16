package ma.intersig.magasin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import ma.intersig.magasin.config.CurrentUserId;
import ma.intersig.magasin.dto.response.ImportGasoilReport;
import ma.intersig.magasin.exception.BusinessException;
import ma.intersig.magasin.service.ImportGasoilService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Import gasoil", description = "One-shot import of the historical GASOIL Excel log")
@RestController
@RequestMapping("/api/v1/magasin/import")
public class ImportGasoilController {

    private final ImportGasoilService importService;

    public ImportGasoilController(ImportGasoilService importService) {
        this.importService = importService;
    }

    @Operation(summary = "Import the GASOIL 25 Excel history (re-runnable, replaces previous import)")
    @PostMapping("/gasoil")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ImportGasoilReport> importGasoil(@RequestParam("file") MultipartFile file,
                                                           @CurrentUserId Long userId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Aucun fichier fourni", "IMPORT_FICHIER_VIDE", 400);
        }
        return ResponseEntity.ok(importService.importExcel(file, userId));
    }
}
