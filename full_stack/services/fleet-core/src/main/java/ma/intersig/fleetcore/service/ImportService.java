package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.report.ImportReportDto;
import ma.intersig.fleetcore.dto.report.ImportReportDto.ImportRowError;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.entity.Camion;
import ma.intersig.fleetcore.entity.Composant;
import ma.intersig.fleetcore.entity.ImportsHistorique;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.repository.ComposantRepository;
import ma.intersig.fleetcore.repository.ImportsHistoriqueRepository;
import ma.intersig.fleetcore.repository.UserRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

@Service
@Transactional
public class ImportService {

    private static final Map<String, List<String>> ENTITY_FIELDS = Map.of(
            "vehicules", List.of("code", "statut", "chauffeur_nom", "chauffeur_prenom", "km_initial"),
            "composants", List.of("reference", "designation", "parent_code")
    );

    private static final Set<String> VALID_STATUTS = Set.of(
            "in-service", "workshop", "maintenance", "out-of-service");

    private final VehiculeRepository vehiculeRepository;
    private final ComposantRepository composantRepository;
    private final ImportsHistoriqueRepository importsHistoriqueRepository;
    private final UserRepository userRepository;
    private final VehiculeService vehiculeService;

    public ImportService(VehiculeRepository vehiculeRepository,
                         ComposantRepository composantRepository,
                         ImportsHistoriqueRepository importsHistoriqueRepository,
                         UserRepository userRepository,
                         VehiculeService vehiculeService) {
        this.vehiculeRepository = vehiculeRepository;
        this.composantRepository = composantRepository;
        this.importsHistoriqueRepository = importsHistoriqueRepository;
        this.userRepository = userRepository;
        this.vehiculeService = vehiculeService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ImportsHistorique> getHistorique(Pageable pageable) {
        return PageResponse.of(importsHistoriqueRepository.findAllByOrderByCreatedAtDesc(pageable));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getFields(String entite) {
        if (!ENTITY_FIELDS.containsKey(entite)) {
            throw new BusinessException("Unknown entity: " + entite, "UNKNOWN_ENTITY", 400);
        }
        return Map.of("entite", entite, "fields", ENTITY_FIELDS.get(entite));
    }

    @Transactional
    public ImportReportDto importGeneral(MultipartFile file, Map<Integer, String> mapping, String entite, Long userId) {
        List<ImportRowError> errors = new ArrayList<>();
        int total = 0;
        int ok = 0;

        if (!ENTITY_FIELDS.containsKey(entite)) {
            throw new BusinessException("Unknown entity: " + entite, "UNKNOWN_ENTITY", 400);
        }

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                total++;

                try {
                    Map<String, String> values = extractRowValues(row, mapping);

                    boolean success = switch (entite) {
                        case "vehicules" -> importVehicule(values, errors, i);
                        case "composants" -> importComposant(values, errors, i);
                        default -> false;
                    };
                    if (success) ok++;
                } catch (Exception e) {
                    errors.add(new ImportRowError(i + 1, "general", e.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new BusinessException("Failed to read Excel file: " + e.getMessage(), "IMPORT_ERROR", 400);
        }

        int erreur = total - ok;
        saveHistorique(file.getOriginalFilename(), "excel_" + entite, total, ok, erreur, userId);

        return ImportReportDto.of(total, ok, erreur, errors);
    }

    private Map<String, String> extractRowValues(Row row, Map<Integer, String> mapping) {
        Map<String, String> values = new HashMap<>();
        for (Map.Entry<Integer, String> entry : mapping.entrySet()) {
            int colIdx = entry.getKey();
            String fieldName = entry.getValue();
            Cell cell = row.getCell(colIdx);
            String value = cell != null ? getCellAsString(cell) : null;
            values.put(fieldName, value);
        }
        return values;
    }

    private String getCellAsString(Cell cell) {
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

    private boolean importVehicule(Map<String, String> values, List<ImportRowError> errors, int rowIdx) {
        String code = values.get("code");
        if (code == null || code.isBlank()) {
            errors.add(new ImportRowError(rowIdx + 1, "code", "CODE_REQUIRED"));
            return false;
        }

        String statutValue = values.get("statut");
        if (statutValue != null && !VALID_STATUTS.contains(statutValue)) {
            errors.add(new ImportRowError(rowIdx + 1, "statut", "INVALID_STATUT"));
            return false;
        }

        Optional<Vehicule> existing = vehiculeRepository.findByCodeAndIdNot(code, -1L);
        Vehicule vehicule;
        if (existing.isPresent()) {
            vehicule = existing.get();
            if (values.get("statut") != null) vehicule.setStatut(values.get("statut"));
            vehiculeRepository.save(vehicule);
        } else {
            String type = values.getOrDefault("type", "camion");
            if ("camion".equalsIgnoreCase(type)) {
                vehicule = new Camion();
            } else {
                vehicule = new Vehicule();
            }
            vehicule.setCode(code);
            vehicule.setType(type);
            vehicule.setMarque(values.getOrDefault("marque", "Import"));
            vehicule.setStatut(values.getOrDefault("statut", "in-service"));
            vehicule.setActif(true);
            vehicule = vehiculeRepository.save(vehicule);
        }

        String chauffeurNom = values.get("chauffeur_nom");
        String chauffeurPrenom = values.get("chauffeur_prenom");
        if ((chauffeurNom != null || chauffeurPrenom != null) && vehicule instanceof Camion) {
            vehiculeService.updateCamionChauffeur(vehicule.getId(), chauffeurNom, chauffeurPrenom);
        }
        return true;
    }

    private boolean importComposant(Map<String, String> values, List<ImportRowError> errors, int rowIdx) {
        String designation = values.get("designation");
        String reference = values.get("reference");

        Composant c;
        if (reference != null && !reference.isBlank()) {
            c = composantRepository.findByReference(reference).orElseGet(Composant::new);
            c.setReference(reference);
        } else {
            c = new Composant();
        }
        c.setDesignation(designation != null ? designation : "Imported");
        c.setActif(true);

        String parentCode = values.get("parent_code");
        if (parentCode != null && !parentCode.isBlank()) {
            Optional<Composant> parentOpt = composantRepository.findByReference(parentCode);
            if (parentOpt.isPresent()) {
                c.setParent(parentOpt.get());
                c.setNiveau((short) (parentOpt.get().getNiveau() + 1));
            } else {
                c.setNiveau((short) 1);
            }
        } else {
            c.setNiveau((short) 1);
        }
        composantRepository.save(c);
        return true;
    }

    private void saveHistorique(String filename, String type, int total, int ok, int erreur, Long userId) {
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        ImportsHistorique historique = new ImportsHistorique();
        historique.setUser(user);
        historique.setFichier(filename);
        historique.setType(type);
        historique.setLignesTotal(total);
        historique.setLignesOk(ok);
        historique.setLignesErreur(erreur);
        importsHistoriqueRepository.save(historique);
    }
}