package ma.intersig.fleetcore.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import ma.intersig.fleetcore.dto.request.CreateAttelageRequest;
import ma.intersig.fleetcore.dto.request.TerminateAttelageRequest;
import ma.intersig.fleetcore.dto.response.AttelageDto;
import ma.intersig.fleetcore.service.AttelageService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/attelages")
@Tag(name = "Attelages", description = "Gestion des attelages tracteur/semi-remorque")
public class AttelageController {

    private final AttelageService service;

    public AttelageController(AttelageService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AttelageDto create(@RequestBody @Valid CreateAttelageRequest req) {
        return service.create(req);
    }

    @GetMapping
    public List<AttelageDto> list(
            @RequestParam(required = false) Long tracteurId,
            @RequestParam(required = false) Long semiId) {
        if (tracteurId != null) return service.listByTracteur(tracteurId);
        if (semiId != null)     return service.listBySemi(semiId);
        return List.of();
    }

    @PatchMapping("/{id}/terminer")
    public AttelageDto terminate(@PathVariable Long id,
                                 @RequestBody @Valid TerminateAttelageRequest req) {
        return service.terminate(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
