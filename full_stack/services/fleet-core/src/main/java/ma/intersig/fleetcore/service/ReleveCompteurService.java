package ma.intersig.fleetcore.service;

import jakarta.persistence.EntityManager;
import ma.intersig.fleetcore.dto.report.ImportReportDto;
import ma.intersig.fleetcore.dto.report.ImportReportDto.ImportRowError;
import ma.intersig.fleetcore.dto.request.CreateReleveRequest;
import ma.intersig.fleetcore.dto.response.ReleveCompteurDto;
import ma.intersig.fleetcore.entity.Camion;
import ma.intersig.fleetcore.entity.ImportsHistorique;
import ma.intersig.fleetcore.entity.ReleveCompteur;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ReleveRegressionException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.ImportsHistoriqueRepository;
import ma.intersig.fleetcore.repository.ReleveCompteurRepository;
import ma.intersig.fleetcore.repository.UserRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class ReleveCompteurService {

    private static final Logger log = LoggerFactory.getLogger(ReleveCompteurService.class);

    private static final DateTimeFormatter[] DATE_FORMATS = {
        DateTimeFormatter.ISO_OFFSET_DATE_TIME,
        DateTimeFormatter.ISO_LOCAL_DATE_TIME,
        DateTimeFormatter.ISO_LOCAL_DATE,
        DateTimeFormatter.ofPattern("dd/MM/yyyy"),
        DateTimeFormatter.ofPattern("dd-MM-yyyy"),
    };

    private final ReleveCompteurRepository releveRepository;
    private final VehiculeRepository vehiculeRepository;
    private final UserRepository userRepository;
    private final ImportsHistoriqueRepository importsHistoriqueRepository;
    private final EntityManager entityManager;

    public ReleveCompteurService(ReleveCompteurRepository releveRepository,
                                  VehiculeRepository vehiculeRepository,
                                  UserRepository userRepository,
                                  ImportsHistoriqueRepository importsHistoriqueRepository,
                                  EntityManager entityManager) {
        this.releveRepository = releveRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.userRepository = userRepository;
        this.importsHistoriqueRepository = importsHistoriqueRepository;
        this.entityManager = entityManager;
    }

    public ReleveCompteurDto create(CreateReleveRequest req, Long createdBy) {
        Vehicule vehicule = vehiculeRepository.findById(req.vehiculeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));

        if (vehicule instanceof Camion camion && req.compteurKm() != null
                && camion.getCompteurKm() != null) {
            if (req.compteurKm() < camion.getCompteurKm()) {
                throw new ReleveRegressionException(
                        "Counter regression: " + req.compteurKm() + " < " + camion.getCompteurKm());
            }
        }

        User user = createdBy != null ? userRepository.findById(createdBy).orElse(null) : null;

        ReleveCompteur releve = new ReleveCompteur();
        releve.setVehicule(vehicule);
        releve.setDateReleve(req.dateReleve());
        releve.setCompteurKm(req.compteurKm());
        releve.setCompteurHeures(req.compteurHeures());
        releve.setSource("manual");
        releve.setCreatedBy(user);

        releve = releveRepository.save(releve);
        entityManager.flush();
        entityManager.refresh(vehicule);

        return ReleveCompteurDto.from(releve);
    }

    @Transactional(readOnly = true)
    public List<ReleveCompteurDto> listByVehicule(Long vehiculeId) {
        return releveRepository.findByVehiculeIdOrderByDateReleveDesc(vehiculeId)
                .stream()
                .map(ReleveCompteurDto::from)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public ImportReportDto importExcel(MultipartFile file, Long userId) {
        List<ImportRowError> errors = new ArrayList<>();
        int total = 0;
        int ok = 0;

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                total++;

                try {
                    String code = getCellAsString(row.getCell(0));
                    String dateStr = getCellAsString(row.getCell(1));
                    String kmStr = getCellAsString(row.getCell(2));
                    String heuresStr = getCellAsString(row.getCell(3));

                    if (code == null || code.isBlank()) {
                        errors.add(new ImportRowError(i + 1, "vehicule_code", "VEHICLE_NOT_FOUND"));
                        continue;
                    }

                    List<Vehicule> matches = vehiculeRepository.findByCode(code);
                    if (matches.isEmpty()) {
                        errors.add(new ImportRowError(i + 1, "vehicule_code", "VEHICLE_NOT_FOUND"));
                        continue;
                    }
                    Vehicule vehicule = matches.get(0);

                    OffsetDateTime dateReleve = parseDate(dateStr, i + 1);
                    if (dateReleve == null) {
                        errors.add(new ImportRowError(i + 1, "date_releve", "INVALID_DATE_FORMAT"));
                        continue;
                    }

                    Integer km = null;
                    Integer heures = null;
                    try {
                        km = kmStr != null ? Integer.parseInt(kmStr) : null;
                        heures = heuresStr != null ? Integer.parseInt(heuresStr) : null;
                    } catch (NumberFormatException e) {
                        errors.add(new ImportRowError(i + 1, "compteur_km", "INVALID_NUMBER_FORMAT"));
                        continue;
                    }
                    CreateReleveRequest req = new CreateReleveRequest(
                            vehicule.getId(),
                            dateReleve,
                            km,
                            heures
                    );

                    create(req, userId);
                    ok++;
                } catch (ReleveRegressionException e) {
                    errors.add(new ImportRowError(i + 1, "compteur_km", "RELEVE_REGRESSION"));
                } catch (Exception e) {
                    log.error("Import row {} failed", i + 1, e);
                    errors.add(new ImportRowError(i + 1, "general", "PROCESSING_ERROR"));
                }
            }
        } catch (IOException e) {
            log.error("Failed to read Excel import file: {}", e.getMessage(), e);
            throw new BusinessException("Failed to read Excel file", "IMPORT_IO_ERROR", 400);
        }

        int erreur = total - ok;
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
        ImportsHistorique histo = new ImportsHistorique();
        histo.setUser(user);
        histo.setFichier(file.getOriginalFilename());
        histo.setType("releves_compteurs");
        histo.setLignesTotal(total);
        histo.setLignesOk(ok);
        histo.setLignesErreur(erreur);
        importsHistoriqueRepository.save(histo);

        return ImportReportDto.of(total, ok, erreur, errors);
    }

    private OffsetDateTime parseDate(String dateStr, int rowNum) {
        if (dateStr == null || dateStr.isBlank()) {
            return OffsetDateTime.now();
        }
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try {
                return OffsetDateTime.parse(dateStr, fmt);
            } catch (DateTimeParseException ignored) {}
            try {
                return LocalDate.parse(dateStr, fmt).atStartOfDay().atOffset(ZoneOffset.UTC);
            } catch (DateTimeParseException ignored) {}
        }
        log.warn("Import row {}: unrecognised date '{}', skipping row", rowNum, dateStr);
        return null;
    }

    private String getCellAsString(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d)) {
                    yield String.valueOf((long) d);
                } else {
                    yield String.valueOf(d);
                }
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }
}