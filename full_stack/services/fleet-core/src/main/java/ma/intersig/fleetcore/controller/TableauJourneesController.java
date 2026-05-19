package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.dto.response.TableauJourneesDto;
import ma.intersig.fleetcore.service.TableauJourneesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "Tableau Journées", description = "Daily vehicle status dashboard")
@RestController
@RequestMapping("/api/v1")
public class TableauJourneesController {

    private final TableauJourneesService tableauJourneesService;

    public TableauJourneesController(TableauJourneesService tableauJourneesService) {
        this.tableauJourneesService = tableauJourneesService;
    }

    @Operation(summary = "Get daily vehicle status dashboard for a given date")
    @GetMapping("/tableau-journees")
    public ResponseEntity<TableauJourneesDto> getTableau(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(tableauJourneesService.get(date));
    }
}