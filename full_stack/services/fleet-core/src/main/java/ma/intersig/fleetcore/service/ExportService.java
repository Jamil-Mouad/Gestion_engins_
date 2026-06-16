package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.entity.*;
import ma.intersig.fleetcore.repository.*;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ExportService {

    private final VehiculeRepository vehiculeRepository;
    private final InterventionRepository interventionRepository;
    private final PneuRepository pneuRepository;
    private final SuiviVidangeRepository suiviVidangeRepository;
    private final ReleveCompteurRepository releveCompteurRepository;
    private final ComposantRepository composantRepository;
    private final DemandeAchatRepository demandeAchatRepository;
    private final TracteurSemiAssignmentRepository tracteurSemiAssignmentRepository;

    public ExportService(VehiculeRepository vehiculeRepository,
                         InterventionRepository interventionRepository,
                         PneuRepository pneuRepository,
                         SuiviVidangeRepository suiviVidangeRepository,
                         ReleveCompteurRepository releveCompteurRepository,
                         ComposantRepository composantRepository,
                         DemandeAchatRepository demandeAchatRepository,
                         TracteurSemiAssignmentRepository tracteurSemiAssignmentRepository) {
        this.vehiculeRepository = vehiculeRepository;
        this.interventionRepository = interventionRepository;
        this.pneuRepository = pneuRepository;
        this.suiviVidangeRepository = suiviVidangeRepository;
        this.releveCompteurRepository = releveCompteurRepository;
        this.composantRepository = composantRepository;
        this.demandeAchatRepository = demandeAchatRepository;
        this.tracteurSemiAssignmentRepository = tracteurSemiAssignmentRepository;
    }

    public byte[] exportExcel(List<String> entites, String periode) throws IOException {
        return exportExcel(entites, periode, null, null, null, null, null);
    }

    public byte[] exportExcel(List<String> entites, String periode, Long vehiculeId, String vehiculeType) throws IOException {
        return exportExcel(entites, periode, vehiculeId, vehiculeType, null, null, null);
    }

    public byte[] exportExcel(List<String> entites, String periode, Long vehiculeId, String vehiculeType,
                               String statut, String categorie, List<String> columns) throws IOException {
        if (entites == null) {
            throw new IllegalArgumentException("entites must not be null");
        }
        OffsetDateTime[] range = parseMonthRange(periode);

        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            if (entites.contains("vehicules")) {
                writeVehiculesSheet(workbook, statut, vehiculeType, columns);
            }
            if (entites.contains("interventions")) {
                writeInterventionsSheet(workbook, range, vehiculeId, statut, categorie, columns);
            }
            if (entites.contains("pneus")) {
                writePneusSheet(workbook, vehiculeId, vehiculeType, statut, columns);
            }
            if (entites.contains("vidanges")) {
                writeVidangesSheet(workbook);
            }
            if (entites.contains("releves")) {
                writeRelevesSheet(workbook, range);
            }
            if (entites.contains("composants")) {
                writeComposantsSheet(workbook, vehiculeId, vehiculeType, categorie, columns);
            }
            if (entites.contains("demandesAchat")) {
                writeDemandesAchatSheet(workbook, statut, columns);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private OffsetDateTime[] parseMonthRange(String periode) {
        if (periode == null || periode.isBlank()) return null;
        try {
            YearMonth ym = YearMonth.parse(periode);
            return new OffsetDateTime[]{
                ym.atDay(1).atStartOfDay().atOffset(java.time.ZoneOffset.UTC),
                ym.atEndOfMonth().atTime(23, 59, 59).atOffset(java.time.ZoneOffset.UTC)
            };
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static final List<String> VEH_ALL_COLS = List.of(
            "code", "type", "marque", "modele", "matricule", "n_chassis", "annee", "carburant", "statut");
    private static final java.util.Map<String, String> VEH_HEADERS = java.util.Map.of(
            "code", "Code", "type", "Type", "marque", "Marque", "modele", "Modèle",
            "matricule", "Matricule", "n_chassis", "N° Châssis", "annee", "Année",
            "carburant", "Carburant", "statut", "Statut");

    private void writeVehiculesSheet(XSSFWorkbook workbook, String statut, String vehiculeType, List<String> columns) {
        List<String> activeCols = resolveColumns(columns, VEH_ALL_COLS);
        Sheet sheet = workbook.createSheet("Véhicules");
        Row header = sheet.createRow(0);
        for (int i = 0; i < activeCols.size(); i++) {
            header.createCell(i).setCellValue(VEH_HEADERS.getOrDefault(activeCols.get(i), activeCols.get(i)));
        }
        List<Vehicule> vehicules = vehiculeRepository.findAll().stream()
                .filter(v -> statut == null || statut.isBlank() || statut.equalsIgnoreCase(v.getStatut()))
                .filter(v -> vehiculeType == null || vehiculeType.isBlank() || vehiculeType.equals(v.getType()))
                .toList();
        int rowIdx = 1;
        for (Vehicule v : vehicules) {
            Row row = sheet.createRow(rowIdx++);
            for (int i = 0; i < activeCols.size(); i++) {
                row.createCell(i).setCellValue(vehColValue(activeCols.get(i), v));
            }
        }
    }

    private String vehColValue(String col, Vehicule v) {
        return switch (col) {
            case "code"      -> v.getCode() != null ? v.getCode() : "";
            case "type"      -> v.getType() != null ? v.getType() : "";
            case "marque"    -> v.getMarque() != null ? v.getMarque() : "";
            case "modele"    -> v.getModele() != null ? v.getModele() : "";
            case "matricule" -> v.getMatricule() != null ? v.getMatricule() : "";
            case "n_chassis" -> v.getNChassis() != null ? v.getNChassis() : "";
            case "annee"     -> v.getAnnee() != null ? v.getAnnee().toString() : "";
            case "carburant" -> v.getCarburant() != null ? v.getCarburant() : "";
            case "statut"    -> v.getStatut() != null ? v.getStatut() : "";
            default          -> "";
        };
    }

    private static final List<String> INT_ALL_COLS = List.of(
            "nBs", "date", "vehicule", "categorie", "composant", "cout", "statut");
    private static final java.util.Map<String, String> INT_HEADERS = java.util.Map.of(
            "nBs", "N°BS", "date", "Date", "vehicule", "Véhicule", "categorie", "Type",
            "composant", "Composant", "cout", "Coût total (MAD)", "statut", "Statut");

    private void writeInterventionsSheet(XSSFWorkbook workbook, OffsetDateTime[] range, Long vehiculeId,
                                         String statut, String categorie, List<String> columns) {
        List<String> activeCols = resolveColumns(columns, INT_ALL_COLS);
        Sheet sheet = workbook.createSheet("Interventions");
        Row header = sheet.createRow(0);
        for (int i = 0; i < activeCols.size(); i++) {
            header.createCell(i).setCellValue(INT_HEADERS.getOrDefault(activeCols.get(i), activeCols.get(i)));
        }

        List<Intervention> interventions;
        if (vehiculeId != null) {
            interventions = interventionRepository.findAllWithVehiculeByVehiculeId(vehiculeId);
        } else if (range != null) {
            interventions = interventionRepository.findAllWithVehiculeInRange(range[0], range[1]);
        } else {
            Boolean enCours = null;
            if ("en_cours".equalsIgnoreCase(statut)) enCours = true;
            else if ("cloture".equalsIgnoreCase(statut)) enCours = false;
            String categorieParam = (categorie != null && !categorie.isBlank()) ? categorie : null;
            interventions = interventionRepository.findAllWithVehiculeFiltered(enCours, categorieParam);
        }

        int rowIdx = 1;
        for (Intervention i : interventions) {
            Row row = sheet.createRow(rowIdx++);
            for (int c = 0; c < activeCols.size(); c++) {
                String val = intColValue(activeCols.get(c), i);
                row.createCell(c).setCellValue(val);
            }
        }
    }

    private String intColValue(String col, Intervention i) {
        return switch (col) {
            case "nBs"       -> i.getNBs() != null ? i.getNBs() : "";
            case "date"      -> i.getDateDebut() != null ? i.getDateDebut().toLocalDate().toString() : "";
            case "vehicule"  -> i.getVehicule() != null ? i.getVehicule().getCode() : "";
            case "categorie" -> i.getTypeIntervention() != null ? i.getTypeIntervention().getLibelle() : "";
            case "composant" -> i.getComposant() != null ? i.getComposant().getDesignation() : "";
            case "cout"      -> i.getCoutTotal() != null ? String.valueOf(i.getCoutTotal().doubleValue()) : "0";
            case "statut"    -> mapInterventionStatut(i);
            default          -> "";
        };
    }

    private String mapInterventionStatut(Intervention i) {
        // Intervention has no dedicated statut field; status is derived from dateFin
        return i.getDateFin() == null ? "En cours" : "Terminée";
    }

    private static final List<String> PNEU_ALL_COLS = List.of(
            "vehicule", "partie", "position", "reference", "nSerie", "marque", "dateMontage",
            "kmParcourus", "kmRestant", "expectedLifeKm", "pressionPsi", "profondeur32e",
            "status", "actif");
    private static final java.util.Map<String, String> PNEU_HEADERS = java.util.Map.ofEntries(
            java.util.Map.entry("vehicule", "Véhicule"),
            java.util.Map.entry("partie", "Partie"),
            java.util.Map.entry("position", "Position"),
            java.util.Map.entry("reference", "Référence"),
            java.util.Map.entry("nSerie", "N° Série"),
            java.util.Map.entry("marque", "Marque"),
            java.util.Map.entry("dateMontage", "Date de montage"),
            java.util.Map.entry("kmParcourus", "Km parcourus"),
            java.util.Map.entry("kmRestant", "Km restants"),
            java.util.Map.entry("expectedLifeKm", "Durée de vie (km)"),
            java.util.Map.entry("pressionPsi", "Pression (PSI)"),
            java.util.Map.entry("profondeur32e", "Profondeur (32e)"),
            java.util.Map.entry("status", "Statut"),
            java.util.Map.entry("actif", "Actif"));

    private void writePneusSheet(XSSFWorkbook workbook, Long vehiculeId, String vehiculeType,
                                 String statut, List<String> columns) {
        List<String> activeCols = resolveColumns(columns, PNEU_ALL_COLS);
        Sheet sheet = workbook.createSheet("Pneus");
        Row header = sheet.createRow(0);
        for (int i = 0; i < activeCols.size(); i++) {
            header.createCell(i).setCellValue(PNEU_HEADERS.getOrDefault(activeCols.get(i), activeCols.get(i)));
        }

        // For a camion_tracteur, the export covers the whole attelage: the
        // semi's tires are included too, distinguished by the "partie" column.
        Long semiId = null;
        if (vehiculeId != null) {
            semiId = tracteurSemiAssignmentRepository
                    .findByTracteurIdAndDateFinIsNullAndActifTrue(vehiculeId)
                    .map(a -> a.getSemi().getId())
                    .orElse(null);
        }
        final Long tracteurId = vehiculeId;
        final Long attachedSemiId = semiId;

        List<Pneu> pneus = pneuRepository.findAllWithVehicule().stream()
                .filter(p -> tracteurId == null
                        || (p.getVehicule() != null
                            && (tracteurId.equals(p.getVehicule().getId())
                                || (attachedSemiId != null && attachedSemiId.equals(p.getVehicule().getId())))))
                .filter(p -> vehiculeType == null || vehiculeType.isBlank()
                        || (p.getVehicule() != null && vehiculeType.equals(p.getVehicule().getType())))
                .filter(p -> statut == null || statut.isBlank() || statut.equalsIgnoreCase(p.getStatus()))
                .toList();

        int rowIdx = 1;
        for (Pneu p : pneus) {
            Row row = sheet.createRow(rowIdx++);
            for (int i = 0; i < activeCols.size(); i++) {
                row.createCell(i).setCellValue(pneuColValue(activeCols.get(i), p, attachedSemiId));
            }
        }
    }

    private String pneuColValue(String col, Pneu p, Long attachedSemiId) {
        return switch (col) {
            case "vehicule"       -> p.getVehicule() != null ? p.getVehicule().getCode() : "";
            case "partie"         -> partieLabel(p, attachedSemiId);
            case "position"       -> p.getPosition() != null ? String.valueOf(p.getPosition()) : "";
            case "reference"      -> p.getReference() != null ? p.getReference() : "";
            case "nSerie"         -> p.getNSerie() != null ? p.getNSerie() : "";
            case "marque"         -> p.getMarque() != null ? p.getMarque() : "";
            case "dateMontage"    -> p.getDateMontage() != null ? p.getDateMontage().toString() : "";
            case "kmParcourus"    -> p.getKmParcourus() != null ? String.valueOf(p.getKmParcourus()) : "0";
            case "kmRestant"      -> p.getKmRestant() != null ? String.valueOf(p.getKmRestant()) : "0";
            case "expectedLifeKm" -> p.getExpectedLifeKm() != null ? String.valueOf(p.getExpectedLifeKm()) : "";
            case "pressionPsi"    -> p.getPressionPsi() != null ? p.getPressionPsi().toPlainString() : "";
            case "profondeur32e"  -> p.getProfondeur32e() != null ? String.valueOf(p.getProfondeur32e()) : "";
            case "status"         -> p.getStatus() != null ? p.getStatus() : "";
            case "actif"          -> Boolean.TRUE.equals(p.getActif()) ? "Oui" : "Non";
            default               -> "";
        };
    }

    private String partieLabel(Pneu p, Long attachedSemiId) {
        if (p.getVehicule() == null) return "";
        if (attachedSemiId != null && attachedSemiId.equals(p.getVehicule().getId())) {
            return "Semi-remorque";
        }
        String type = p.getVehicule().getType();
        if ("camion_tracteur".equals(type)) return "Tracteur";
        if ("semi_remorque".equals(type))   return "Semi-remorque";
        return "—";
    }

    private void writeVidangesSheet(XSSFWorkbook workbook) {
        Sheet sheet = workbook.createSheet("Vidanges");
        Row header = sheet.createRow(0);
        String[] cols = {"id", "vehicule_id", "statut", "intervalle_nbh", "nbh_restant", "date_dernier_entretien"};
        for (int i = 0; i < cols.length; i++) {
            header.createCell(i).setCellValue(cols[i]);
        }
        List<SuiviVidange> vidanges = suiviVidangeRepository.findAllWithVehicule();
        int rowIdx = 1;
        for (SuiviVidange v : vidanges) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(v.getId());
            row.createCell(1).setCellValue(v.getVehicule() != null ? v.getVehicule().getId() : 0);
            row.createCell(2).setCellValue(v.getStatut() != null ? v.getStatut() : "");
            row.createCell(3).setCellValue(v.getIntervalleNbh() != null ? v.getIntervalleNbh() : 0);
            row.createCell(4).setCellValue(v.getNbhRestant() != null ? v.getNbhRestant() : 0);
            row.createCell(5).setCellValue(v.getDateDernierEntretien() != null ? v.getDateDernierEntretien().toString() : "");
        }
    }

    private void writeRelevesSheet(XSSFWorkbook workbook, OffsetDateTime[] range) {
        Sheet sheet = workbook.createSheet("Relevés Compteur");
        Row header = sheet.createRow(0);
        String[] cols = {"id", "vehicule_id", "date_releve", "compteur_km", "compteur_heures", "source"};
        for (int i = 0; i < cols.length; i++) {
            header.createCell(i).setCellValue(cols[i]);
        }
        List<ReleveCompteur> releves = range != null
                ? releveCompteurRepository.findAllWithVehiculeBetweenDates(range[0], range[1])
                : releveCompteurRepository.findAllWithVehicule();
        int rowIdx = 1;
        for (ReleveCompteur r : releves) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(r.getId());
            row.createCell(1).setCellValue(r.getVehicule() != null ? r.getVehicule().getId() : 0);
            row.createCell(2).setCellValue(r.getDateReleve() != null ? r.getDateReleve().toString() : "");
            row.createCell(3).setCellValue(r.getCompteurKm() != null ? r.getCompteurKm() : 0);
            row.createCell(4).setCellValue(r.getCompteurHeures() != null ? r.getCompteurHeures() : 0);
            row.createCell(5).setCellValue(r.getSource() != null ? r.getSource() : "");
        }
    }

    private static final List<String> COMP_ALL_COLS = List.of(
            "vehicule", "reference", "designation", "partie", "unite", "stock", "marque", "prix", "niveau");
    private static final java.util.Map<String, String> COMP_HEADERS = java.util.Map.of(
            "vehicule", "Véhicule",
            "reference", "Référence", "designation", "Désignation", "partie", "Partie",
            "unite", "Unité", "stock", "Stock", "marque", "Marque",
            "prix", "Prix unitaire (MAD)", "niveau", "Niveau");

    private void writeComposantsSheet(XSSFWorkbook workbook, Long vehiculeId, String vehiculeType, String categorie, List<String> columns) {
        List<String> activeCols = resolveColumns(columns, COMP_ALL_COLS);
        Sheet sheet = workbook.createSheet("Composants");
        Row header = sheet.createRow(0);
        for (int i = 0; i < activeCols.size(); i++) {
            header.createCell(i).setCellValue(COMP_HEADERS.getOrDefault(activeCols.get(i), activeCols.get(i)));
        }

        List<Composant> composants = composantRepository.findAll().stream()
                .filter(c -> Boolean.TRUE.equals(c.getActif()))
                .filter(c -> vehiculeId == null
                        || (c.getVehicule() != null && vehiculeId.equals(c.getVehicule().getId())))
                .filter(c -> vehiculeType == null || vehiculeType.isBlank()
                        || (c.getVehicule() != null && vehiculeType.equals(c.getVehicule().getType()))
                        || (c.getVehicule() == null
                            && (vehiculeType.equals(c.getVehiculeType()) || c.getVehiculeType() == null)))
                .filter(c -> categorie == null || categorie.isBlank()
                        || categorie.equals(c.getCategorie() != null ? c.getCategorie() : ""))
                .sorted(Comparator.comparing(Composant::getDesignation, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        int rowIdx = 1;
        for (Composant c : composants) {
            Row row = sheet.createRow(rowIdx++);
            for (int i = 0; i < activeCols.size(); i++) {
                row.createCell(i).setCellValue(compColValue(activeCols.get(i), c));
            }
        }
    }

    private String compColValue(String col, Composant c) {
        return switch (col) {
            case "vehicule"    -> c.getVehicule() != null ? c.getVehicule().getCode() : "Modèle";
            case "reference"   -> c.getReference() != null ? c.getReference() : "";
            case "designation" -> c.getDesignation() != null ? c.getDesignation() : "";
            case "partie"      -> c.getCategorie() != null ? c.getCategorie() : "";
            case "unite"       -> c.getUnite() != null ? c.getUnite() : "";
            case "stock"       -> c.getStock() != null ? String.valueOf(c.getStock()) : "0";
            case "marque"      -> c.getMarque() != null ? c.getMarque() : "";
            case "prix"        -> c.getPrixUnitaire() != null ? String.valueOf(c.getPrixUnitaire().doubleValue()) : "";
            case "niveau"      -> c.getNiveau() != null ? String.valueOf(c.getNiveau()) : "";
            default            -> "";
        };
    }

    private static final List<String> DA_ALL_COLS = List.of(
            "id", "date", "demandeur", "piece", "reference", "quantite", "statut");
    private static final java.util.Map<String, String> DA_HEADERS = new java.util.LinkedHashMap<>(java.util.Map.of(
            "id", "ID", "date", "Date", "demandeur", "Demandeur", "piece", "Désignation",
            "reference", "Référence", "quantite", "Qté", "statut", "Statut"));

    private void writeDemandesAchatSheet(XSSFWorkbook workbook, String statut, List<String> columns) {
        List<String> activeCols = resolveColumns(columns, DA_ALL_COLS);
        Sheet sheet = workbook.createSheet("Demandes d'achat");
        Row header = sheet.createRow(0);
        for (int i = 0; i < activeCols.size(); i++) {
            header.createCell(i).setCellValue(DA_HEADERS.getOrDefault(activeCols.get(i), activeCols.get(i)));
        }
        String statutParam = (statut != null && !statut.isBlank()) ? statut : null;
        List<DemandeAchat> demandes = demandeAchatRepository.findAllWithComposantFiltered(statutParam);
        int rowIdx = 1;
        for (DemandeAchat d : demandes) {
            Row row = sheet.createRow(rowIdx++);
            for (int c = 0; c < activeCols.size(); c++) {
                String val = daColValue(activeCols.get(c), d);
                row.createCell(c).setCellValue(val);
            }
        }
    }

    private String daColValue(String col, DemandeAchat d) {
        return switch (col) {
            case "id"        -> d.getId() != null ? String.valueOf(d.getId()) : "";
            case "date"      -> d.getDateDemande() != null ? d.getDateDemande().toLocalDate().toString() : "";
            case "demandeur" -> d.getDemandeurNom() != null ? d.getDemandeurNom() : "";
            case "piece"     -> d.getComposant() != null ? d.getComposant().getDesignation()
                                : (d.getPieceLibre() != null ? d.getPieceLibre() : "");
            case "reference" -> d.getReference() != null ? d.getReference()
                                : (d.getComposant() != null && d.getComposant().getReference() != null
                                   ? d.getComposant().getReference() : "");
            case "quantite"  -> d.getQuantite() != null ? String.valueOf(d.getQuantite()) : "";
            case "statut"    -> d.getStatut() != null ? d.getStatut() : "";
            default          -> "";
        };
    }

    private List<String> resolveColumns(List<String> requested, List<String> allCols) {
        if (requested == null || requested.isEmpty()) return allCols;
        return requested.stream().filter(allCols::contains).toList();
    }
}
