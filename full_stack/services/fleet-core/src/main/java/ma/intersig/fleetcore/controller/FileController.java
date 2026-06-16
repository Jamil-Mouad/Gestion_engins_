package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.util.Map;

@Tag(name = "Fichiers", description = "Vehicle photo upload and retrieval")
@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileStorageService fileStorageService;

    public FileController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @Operation(summary = "Upload a vehicle photo")
    @PostMapping("/vehicule-photos")
    public ResponseEntity<Map<String, String>> uploadPhoto(
            @RequestParam("file") MultipartFile file) {
        try {
            String filename = fileStorageService.store(file);
            String url = "/api/v1/files/vehicule-photos/" + filename;
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("url", url, "filename", filename));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Erreur lors de l'enregistrement du fichier"));
        }
    }

    @Operation(summary = "Upload a tire photo")
    @PostMapping("/pneu-photos")
    public ResponseEntity<Map<String, String>> uploadPneuPhoto(
            @RequestParam("file") MultipartFile file) {
        try {
            String filename = fileStorageService.store(file);
            String url = "/api/v1/files/pneu-photos/" + filename;
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("url", url, "filename", filename));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Erreur lors de l'enregistrement du fichier"));
        }
    }

    @Operation(summary = "Upload a composant photo")
    @PostMapping("/composant-photos")
    public ResponseEntity<Map<String, String>> uploadComposantPhoto(
            @RequestParam("file") MultipartFile file) {
        try {
            String filename = fileStorageService.store(file);
            String url = "/api/v1/files/composant-photos/" + filename;
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("url", url, "filename", filename));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Erreur lors de l'enregistrement du fichier"));
        }
    }

    @Operation(summary = "Serve a composant photo (public)")
    @GetMapping("/composant-photos/{filename}")
    public ResponseEntity<Resource> serveComposantPhoto(
            @PathVariable String filename,
            HttpServletResponse response) {
        try {
            Resource resource = fileStorageService.load(filename);
            String contentType = fileStorageService.contentTypeFor(filename);
            response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (IllegalArgumentException | MalformedURLException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @Operation(summary = "Serve a tire photo (public)")
    @GetMapping("/pneu-photos/{filename}")
    public ResponseEntity<Resource> servePneuPhoto(
            @PathVariable String filename,
            HttpServletResponse response) {
        try {
            Resource resource = fileStorageService.load(filename);
            String contentType = fileStorageService.contentTypeFor(filename);
            response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (IllegalArgumentException | MalformedURLException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @Operation(summary = "Serve a vehicle photo (public)")
    @GetMapping("/vehicule-photos/{filename}")
    public ResponseEntity<Resource> servePhoto(
            @PathVariable String filename,
            HttpServletResponse response) {
        try {
            Resource resource = fileStorageService.load(filename);
            String contentType = fileStorageService.contentTypeFor(filename);
            response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (IllegalArgumentException | MalformedURLException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @Operation(summary = "Upload an intervention photo (proof/archive)")
    @PostMapping("/intervention-photos")
    public ResponseEntity<Map<String, String>> uploadInterventionPhoto(
            @RequestParam("file") MultipartFile file) {
        try {
            String filename = fileStorageService.store(file);
            String url = "/api/v1/files/intervention-photos/" + filename;
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("url", url, "filename", filename));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Erreur lors de l'enregistrement du fichier"));
        }
    }

    @Operation(summary = "Serve an intervention photo (public)")
    @GetMapping("/intervention-photos/{filename}")
    public ResponseEntity<Resource> serveInterventionPhoto(
            @PathVariable String filename,
            HttpServletResponse response) {
        try {
            Resource resource = fileStorageService.load(filename);
            String contentType = fileStorageService.contentTypeFor(filename);
            response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (IllegalArgumentException | MalformedURLException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    @Operation(summary = "Upload a purchase-request proof photo")
    @PostMapping("/demande-photos")
    public ResponseEntity<Map<String, String>> uploadDemandePhoto(
            @RequestParam("file") MultipartFile file) {
        try {
            String filename = fileStorageService.store(file);
            String url = "/api/v1/files/demande-photos/" + filename;
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("url", url, "filename", filename));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Erreur lors de l'enregistrement du fichier"));
        }
    }

    @Operation(summary = "Serve a purchase-request proof photo (public)")
    @GetMapping("/demande-photos/{filename}")
    public ResponseEntity<Resource> serveDemandePhoto(
            @PathVariable String filename,
            HttpServletResponse response) {
        try {
            Resource resource = fileStorageService.load(filename);
            String contentType = fileStorageService.contentTypeFor(filename);
            response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (IllegalArgumentException | MalformedURLException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }
}
