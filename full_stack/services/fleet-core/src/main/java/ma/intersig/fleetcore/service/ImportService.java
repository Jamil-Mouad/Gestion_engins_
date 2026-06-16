package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.report.ImportReportDto;
import ma.intersig.fleetcore.dto.report.ImportReportDto.ImportRowError;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.entity.Camion;
import ma.intersig.fleetcore.entity.Composant;
import ma.intersig.fleetcore.entity.DemandeAchat;
import ma.intersig.fleetcore.entity.ImportsHistorique;
import ma.intersig.fleetcore.entity.Intervention;
import ma.intersig.fleetcore.entity.TypeIntervention;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.repository.ComposantRepository;
import ma.intersig.fleetcore.repository.DemandeAchatRepository;
import ma.intersig.fleetcore.repository.ImportsHistoriqueRepository;
import ma.intersig.fleetcore.repository.InterventionRepository;
import ma.intersig.fleetcore.repository.TypeInterventionRepository;
import ma.intersig.fleetcore.repository.UserRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@Transactional
public class ImportService {

    private static final Map<String, List<String>> ENTITY_FIELDS = Map.ofEntries(
            Map.entry("vehicules", List.of("code", "statut", "chauffeur_nom", "chauffeur_prenom", "km_initial")),
            Map.entry("composants", List.of("reference", "designation", "parent_code")),
            Map.entry("interventions", List.of("vehicule_code", "type_intervention", "categorie",
                    "partie", "n_bs", "date_debut", "date_fin",
                    "cout_pieces", "cout_main_oeuvre", "cout_sous_traitance", "observations")),
            Map.entry("demandes-achat", List.of("piece_libre", "reference", "quantite",
                    "motif", "urgence", "demandeur_nom"))
    );

    private static final Set<String> VALID_STATUTS = Set.of(
            "in-service", "workshop", "maintenance", "out-of-service");

    private static final Set<String> VALID_CATEGORIES = Set.of(
            "preventive", "corrective", "depannage", "controle");

    private final VehiculeRepository vehiculeRepository;
    private final ComposantRepository composantRepository;
    private final InterventionRepository interventionRepository;
    private final DemandeAchatRepository demandeAchatRepository;
    private final TypeInterventionRepository typeInterventionRepository;
    private final ImportsHistoriqueRepository importsHistoriqueRepository;
    private final UserRepository userRepository;
    private final VehiculeService vehiculeService;

    public ImportService(VehiculeRepository vehiculeRepository,
                         ComposantRepository composantRepository,
                         InterventionRepository interventionRepository,
                         DemandeAchatRepository demandeAchatRepository,
                         TypeInterventionRepository typeInterventionRepository,
                         ImportsHistoriqueRepository importsHistoriqueRepository,
                         UserRepository userRepository,
                         VehiculeService vehiculeService) {
        this.vehiculeRepository = vehiculeRepository;
        this.composantRepository = composantRepository;
        this.interventionRepository = interventionRepository;
        this.demandeAchatRepository = demandeAchatRepository;
        this.typeInterventionRepository = typeInterventionRepository;
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
    @CacheEvict(value = {"vehicules-page", "composants-tree"}, allEntries = true)
    public ImportReportDto importGeneral(MultipartFile file, Map<Integer, String> mapping, String entite, Long userId) {
        List<ImportRowError> errors = new ArrayList<>();
        int total = 0;
        int ok = 0;

        if (!ENTITY_FIELDS.containsKey(entite)) {
            throw new BusinessException("Unknown entity: " + entite, "UNKNOWN_ENTITY", 400);
        }

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            if (mapping == null || mapping.isEmpty()) {
                mapping = buildAutoMapping(sheet, entite);
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                total++;

                try {
                    Map<String, String> values = extractRowValues(row, mapping);

                    boolean success = switch (entite) {
                        case "vehicules" -> importVehicule(values, errors, i);
                        case "composants" -> importComposant(values, errors, i);
                        case "interventions" -> importIntervention(values, errors, i);
                        case "demandes-achat" -> importDemandeAchat(values, errors, i, userId);
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
        saveHistorique(file.getOriginalFilename(), "excel_general", total, ok, erreur, userId);

        return ImportReportDto.of(total, ok, erreur, errors);
    }

    private Map<Integer, String> buildAutoMapping(Sheet sheet, String entite) {
        List<String> knownFields = ENTITY_FIELDS.get(entite);
        Map<Integer, String> autoMapping = new LinkedHashMap<>();
        Row headerRow = sheet.getRow(0);
        if (headerRow == null || knownFields == null) return autoMapping;
        for (int colIdx = 0; colIdx < headerRow.getLastCellNum(); colIdx++) {
            Cell cell = headerRow.getCell(colIdx);
            if (cell == null) continue;
            String headerText = cell.getStringCellValue().trim().toLowerCase();
            if (headerText.isEmpty()) continue;
            for (String field : knownFields) {
                if (field.equalsIgnoreCase(headerText)) {
                    autoMapping.put(colIdx, field);
                    break;
                }
            }
        }
        return autoMapping;
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
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield new SimpleDateFormat("yyyy-MM-dd").format(cell.getDateCellValue());
                }
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

        // codes are unique per (code, type) since V121 — a tracteur+semi pair
        // shares one code, so the row's type column disambiguates
        List<Vehicule> matches = vehiculeRepository.findByCode(code);
        String rowType = values.get("type");
        Vehicule existingMatch = null;
        if (!matches.isEmpty()) {
            if (rowType != null && !rowType.isBlank()) {
                existingMatch = matches.stream()
                        .filter(v -> rowType.equalsIgnoreCase(v.getType()))
                        .findFirst().orElse(null);
            } else if (matches.size() == 1) {
                existingMatch = matches.get(0);
            } else {
                errors.add(new ImportRowError(rowIdx + 1, "code", "CODE_AMBIGUOUS_TYPE_REQUIRED"));
                return false;
            }
        }
        Vehicule vehicule;
        if (existingMatch != null) {
            vehicule = existingMatch;
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

    private boolean importIntervention(Map<String, String> values, List<ImportRowError> errors, int rowIdx) {
        String vehiculeCode = values.get("vehicule_code");
        if (vehiculeCode == null || vehiculeCode.isBlank()) {
            errors.add(new ImportRowError(rowIdx + 1, "vehicule_code", "VEHICULE_CODE_REQUIRED"));
            return false;
        }

        List<Vehicule> vehiculeMatches = vehiculeRepository.findByCode(vehiculeCode);
        if (vehiculeMatches.isEmpty()) {
            errors.add(new ImportRowError(rowIdx + 1, "vehicule_code", "VEHICULE_NOT_FOUND"));
            return false;
        }
        if (vehiculeMatches.size() > 1) {
            // tracteur + semi pair sharing one code — interventions target the camion
            vehiculeMatches = vehiculeMatches.stream()
                    .filter(v -> v instanceof Camion)
                    .toList();
            if (vehiculeMatches.size() != 1) {
                errors.add(new ImportRowError(rowIdx + 1, "vehicule_code", "VEHICULE_CODE_AMBIGUOUS"));
                return false;
            }
        }
        Optional<Vehicule> vehiculeOpt = Optional.of(vehiculeMatches.get(0));

        String categorie = values.get("categorie");
        if (categorie == null || categorie.isBlank()) {
            errors.add(new ImportRowError(rowIdx + 1, "categorie", "CATEGORIE_REQUIRED"));
            return false;
        }
        if (!VALID_CATEGORIES.contains(categorie)) {
            errors.add(new ImportRowError(rowIdx + 1, "categorie", "INVALID_CATEGORIE"));
            return false;
        }

        TypeIntervention typeIntervention;
        String typeLibelle = values.get("type_intervention");
        if (typeLibelle != null && !typeLibelle.isBlank()) {
            Optional<TypeIntervention> typeOpt = typeInterventionRepository.findByLibelleIgnoreCase(typeLibelle);
            if (typeOpt.isEmpty()) {
                errors.add(new ImportRowError(rowIdx + 1, "type_intervention", "TYPE_NOT_FOUND"));
                return false;
            }
            typeIntervention = typeOpt.get();
        } else {
            List<TypeIntervention> types = typeInterventionRepository.findAll();
            if (types.isEmpty()) {
                errors.add(new ImportRowError(rowIdx + 1, "type_intervention", "NO_TYPES_AVAILABLE"));
                return false;
            }
            typeIntervention = types.get(0);
        }

        OffsetDateTime dateDebut = parseDate(values.get("date_debut"));
        if (dateDebut == null) dateDebut = OffsetDateTime.now();

        Intervention intervention = new Intervention();
        intervention.setVehicule(vehiculeOpt.get());
        intervention.setTypeIntervention(typeIntervention);
        intervention.setCategorie(categorie);
        intervention.setDateDebut(dateDebut);

        String partie = values.get("partie");
        if (partie != null && !partie.isBlank()) intervention.setPartie(partie);

        String nBs = values.get("n_bs");
        if (nBs != null && !nBs.isBlank()) intervention.setNBs(nBs);

        String observations = values.get("observations");
        if (observations != null && !observations.isBlank()) intervention.setObservations(observations);

        OffsetDateTime dateFin = parseDate(values.get("date_fin"));
        if (dateFin != null) intervention.setDateFin(dateFin);

        intervention.setCoutPieces(parseBigDecimalOrZero(values.get("cout_pieces")));
        intervention.setCoutMainOeuvre(parseBigDecimalOrZero(values.get("cout_main_oeuvre")));
        intervention.setCoutSousTraitance(parseBigDecimalOrZero(values.get("cout_sous_traitance")));

        interventionRepository.save(intervention);
        return true;
    }

    private boolean importDemandeAchat(Map<String, String> values, List<ImportRowError> errors, int rowIdx, Long userId) {
        User demandeur = userId != null ? userRepository.findById(userId).orElse(null) : null;
        if (demandeur == null) {
            errors.add(new ImportRowError(rowIdx + 1, "demandeur", "USER_NOT_FOUND"));
            return false;
        }

        int year = OffsetDateTime.now().getYear();
        Integer seq = demandeAchatRepository.nextCode(year);
        if (seq == null) seq = 1;
        String code = String.format("DA-%d-%04d", year, seq);

        DemandeAchat da = new DemandeAchat();
        da.setCode(code);
        da.setDateDemande(OffsetDateTime.now());
        da.setDemandeur(demandeur);
        da.setStatut("Nouvelle");

        String pieceLibre = values.get("piece_libre");
        if (pieceLibre != null && !pieceLibre.isBlank()) da.setPieceLibre(pieceLibre);

        String reference = values.get("reference");
        if (reference != null && !reference.isBlank()) da.setReference(reference);

        String quantiteStr = values.get("quantite");
        if (quantiteStr != null && !quantiteStr.isBlank()) {
            try { da.setQuantite(Integer.parseInt(quantiteStr)); } catch (NumberFormatException ignored) {}
        }

        String motif = values.get("motif");
        if (motif != null && !motif.isBlank()) da.setMotif(motif);

        String urgence = values.get("urgence");
        if (urgence != null && !urgence.isBlank()) da.setUrgence(urgence);

        String demandeurNom = values.get("demandeur_nom");
        if (demandeurNom != null && !demandeurNom.isBlank()) da.setDemandeurNom(demandeurNom);

        demandeAchatRepository.save(da);
        return true;
    }

    private OffsetDateTime parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return OffsetDateTime.parse(s);
        } catch (Exception ignored) {}
        try {
            return LocalDate.parse(s).atStartOfDay().atOffset(ZoneOffset.UTC);
        } catch (Exception ignored) {}
        return null;
    }

    private BigDecimal parseBigDecimal(String s) {
        if (s == null || s.isBlank()) return null;
        try { return new BigDecimal(s); } catch (NumberFormatException ignored) { return null; }
    }

    private BigDecimal parseBigDecimalOrZero(String s) {
        BigDecimal val = parseBigDecimal(s);
        return val != null ? val : BigDecimal.ZERO;
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
