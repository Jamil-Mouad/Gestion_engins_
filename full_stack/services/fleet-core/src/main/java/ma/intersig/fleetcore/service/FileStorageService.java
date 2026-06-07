package ma.intersig.fleetcore.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class FileStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024L; // 5 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );
    private static final Pattern SAFE_FILENAME = Pattern.compile(
            "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(jpg|jpeg|png|webp)$"
    );

    @Value("${app.upload.dir:./data/uploads/vehicule-photos}")
    private String uploadDir;

    private Path baseDir;

    @PostConstruct
    public void init() throws IOException {
        this.baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(this.baseDir);
    }

    /**
     * Stores the uploaded image file and returns the generated filename.
     * Validates content type and file size.
     */
    public String store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Le fichier dépasse la taille maximale autorisée (5 MB)");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Type de fichier non autorisé. Formats acceptés: JPEG, PNG, WebP");
        }

        String ext = resolveExtension(contentType);
        String filename = UUID.randomUUID().toString() + "." + ext;

        Path target = this.baseDir.resolve(filename).normalize();
        if (!target.startsWith(this.baseDir)) {
            throw new SecurityException("Chemin de fichier invalide");
        }

        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return filename;
    }

    /**
     * Loads an image file as a Spring Resource.
     * Rejects filenames that don't match the expected UUID-based pattern (path traversal prevention).
     */
    public Resource load(String filename) throws MalformedURLException {
        if (filename == null || !SAFE_FILENAME.matcher(filename).matches()) {
            throw new IllegalArgumentException("Nom de fichier invalide");
        }
        Path filePath = this.baseDir.resolve(filename).normalize();
        if (!filePath.startsWith(this.baseDir)) {
            throw new SecurityException("Accès refusé");
        }
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new IllegalArgumentException("Fichier introuvable: " + filename);
        }
        return resource;
    }

    public String contentTypeFor(String filename) {
        if (filename.endsWith(".png")) return "image/png";
        if (filename.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    private String resolveExtension(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/png"  -> "png";
            case "image/webp" -> "webp";
            default           -> "jpg";
        };
    }
}
