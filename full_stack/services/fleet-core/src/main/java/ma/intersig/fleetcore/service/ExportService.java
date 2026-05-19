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
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ExportService {

    private final VehiculeRepository vehiculeRepository;
    private final InterventionRepository interventionRepository;
    private final PneuRepository pneuRepository;
    private final SuiviVidangeRepository suiviVidangeRepository;
    private final ReleveCompteurRepository releveCompteurRepository;

    public ExportService(VehiculeRepository vehiculeRepository,
                         InterventionRepository interventionRepository,
                         PneuRepository pneuRepository,
                         SuiviVidangeRepository suiviVidangeRepository,
                         ReleveCompteurRepository releveCompteurRepository) {
        this.vehiculeRepository = vehiculeRepository;
        this.interventionRepository = interventionRepository;
        this.pneuRepository = pneuRepository;
        this.suiviVidangeRepository = suiviVidangeRepository;
        this.releveCompteurRepository = releveCompteurRepository;
    }

    public byte[] exportExcel(List<String> entites, String periode) throws IOException {
        if (entites == null) {
            throw new IllegalArgumentException("entites must not be null");
        }
        OffsetDateTime[] range = parseMonthRange(periode);

        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            if (entites.contains("vehicules")) {
                writeVehiculesSheet(workbook);
            }
            if (entites.contains("interventions")) {
                writeInterventionsSheet(workbook, range);
            }
            if (entites.contains("pneus")) {
                writePneusSheet(workbook);
            }
            if (entites.contains("vidanges")) {
                writeVidangesSheet(workbook);
            }
            if (entites.contains("releves")) {
                writeRelevesSheet(workbook, range);
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

    private void writeVehiculesSheet(XSSFWorkbook workbook) {
        Sheet sheet = workbook.createSheet("Véhicules");
        Row header = sheet.createRow(0);
        String[] cols = {"id", "code", "type", "marque", "modele", "statut", "actif"};
        for (int i = 0; i < cols.length; i++) {
            header.createCell(i).setCellValue(cols[i]);
        }
        List<Vehicule> vehicules = vehiculeRepository.findAll();
        int rowIdx = 1;
        for (Vehicule v : vehicules) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(v.getId());
            row.createCell(1).setCellValue(v.getCode());
            row.createCell(2).setCellValue(v.getType());
            row.createCell(3).setCellValue(v.getMarque());
            row.createCell(4).setCellValue(v.getModele());
            row.createCell(5).setCellValue(v.getStatut());
            row.createCell(6).setCellValue(v.getActif() != null && v.getActif() ? "true" : "false");
        }
    }

    private void writeInterventionsSheet(XSSFWorkbook workbook, OffsetDateTime[] range) {
        Sheet sheet = workbook.createSheet("Interventions");
        Row header = sheet.createRow(0);
        String[] cols = {"id", "vehicule_id", "categorie", "partie", "date_debut", "date_fin", "cout_total", "statut"};
        for (int i = 0; i < cols.length; i++) {
            header.createCell(i).setCellValue(cols[i]);
        }
        List<Intervention> interventions = range != null
                ? interventionRepository.findAllWithVehiculeInRange(range[0], range[1])
                : interventionRepository.findAllWithVehicule();
        int rowIdx = 1;
        for (Intervention i : interventions) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(i.getId());
            row.createCell(1).setCellValue(i.getVehicule() != null ? i.getVehicule().getId() : 0);
            row.createCell(2).setCellValue(i.getCategorie());
            row.createCell(3).setCellValue(i.getPartie());
            row.createCell(4).setCellValue(i.getDateDebut() != null ? i.getDateDebut().toString() : "");
            row.createCell(5).setCellValue(i.getDateFin() != null ? i.getDateFin().toString() : "");
            row.createCell(6).setCellValue(i.getCoutTotal() != null ? i.getCoutTotal().doubleValue() : 0);
            row.createCell(7).setCellValue(i.getDateFin() == null ? "En cours" : "Terminée");
        }
    }

    private void writePneusSheet(XSSFWorkbook workbook) {
        Sheet sheet = workbook.createSheet("Pneus");
        Row header = sheet.createRow(0);
        String[] cols = {"id", "vehicule_id", "position", "marque", "n_serie", "status", "km_parcourus", "km_restant"};
        for (int i = 0; i < cols.length; i++) {
            header.createCell(i).setCellValue(cols[i]);
        }
        List<Pneu> pneus = pneuRepository.findAllWithVehicule();
        int rowIdx = 1;
        for (Pneu p : pneus) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(p.getId());
            row.createCell(1).setCellValue(p.getVehicule() != null ? p.getVehicule().getId() : 0);
            row.createCell(2).setCellValue(p.getPosition() != null ? p.getPosition() : 0);
            row.createCell(3).setCellValue(p.getMarque() != null ? p.getMarque() : "");
            row.createCell(4).setCellValue(p.getNSerie() != null ? p.getNSerie() : "");
            row.createCell(5).setCellValue(p.getStatus() != null ? p.getStatus() : "");
            row.createCell(6).setCellValue(p.getKmParcourus() != null ? p.getKmParcourus() : 0);
            row.createCell(7).setCellValue(p.getKmRestant() != null ? p.getKmRestant() : 0);
        }
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
}