package ma.intersig.magasin.service;

import ma.intersig.magasin.dto.response.ImportGasoilReport;
import ma.intersig.magasin.entity.Arrivage;
import ma.intersig.magasin.entity.Citerne;
import ma.intersig.magasin.entity.SortieCarburant;
import ma.intersig.magasin.exception.BusinessException;
import ma.intersig.magasin.repository.ArrivageRepository;
import ma.intersig.magasin.repository.SortieCarburantRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * One-shot import of the historical "GASOIL 25" Excel log. Re-runnable: each
 * run wipes the previously imported rows (source = IMPORT) before re-reading
 * the file, so manual entries (source = SAISIE) are never touched.
 *
 * Layout of the two log sheets (Feuil1 = Jan–Oct 2025, 01112025 = Nov 2025→):
 * A totaliseur · C n° BL · D qté arrivage · E PU HT · G date · H destination ·
 * I code (numeric → vehicules.code, text → client tiers) · J compteur ·
 * K demandeur · L n° BS · M qté sortie · N stock courant (ignored, derived).
 * A row holding D + a date is a delivery; the same row can also hold a
 * dispensing. Rows without a date are carry-overs or sheet totals → skipped.
 */
@Service
public class ImportGasoilService {

    private static final Logger log = LoggerFactory.getLogger(ImportGasoilService.class);
    private static final List<String> LOG_SHEETS = List.of("Feuil1", "01112025");
    private static final int MAX_ANOMALIES = 50;

    private final CiterneService citerneService;
    private final ArrivageRepository arrivageRepository;
    private final SortieCarburantRepository sortieRepository;
    private final VehiculeLookup vehiculeLookup;

    public ImportGasoilService(CiterneService citerneService,
                               ArrivageRepository arrivageRepository,
                               SortieCarburantRepository sortieRepository,
                               VehiculeLookup vehiculeLookup) {
        this.citerneService = citerneService;
        this.arrivageRepository = arrivageRepository;
        this.sortieRepository = sortieRepository;
        this.vehiculeLookup = vehiculeLookup;
    }

    @Transactional
    public ImportGasoilReport importExcel(MultipartFile file, Long userId) {
        Citerne citerne = citerneService.getActive();

        long sortiesSupprimees = sortieRepository.deleteBySource("IMPORT");
        long arrivagesSupprimes = arrivageRepository.deleteBySource("IMPORT");

        List<Arrivage> arrivages = new ArrayList<>();
        List<SortieCarburant> sorties = new ArrayList<>();
        Map<String, Integer> codesNonResolus = new LinkedHashMap<>();
        List<String> anomalies = new ArrayList<>();
        int ignorees = 0;

        try (InputStream in = file.getInputStream(); Workbook wb = new XSSFWorkbook(in)) {
            for (String sheetName : LOG_SHEETS) {
                Sheet sheet = wb.getSheet(sheetName);
                if (sheet == null) {
                    throw new BusinessException(
                            "Feuille « " + sheetName + " » introuvable dans le fichier",
                            "IMPORT_FEUILLE_MANQUANTE", 400);
                }
                for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null || isBlankRow(row)) continue;

                    LocalDate date = readDate(row.getCell(6));
                    BigDecimal qteArrivage = readNumber(row.getCell(3));
                    BigDecimal qteSortie = firstPositive(readNumber(row.getCell(12)), readNumber(row.getCell(1)));

                    if (date == null) {
                        // carry-over rows, sheet totals, stray cells
                        ignorees++;
                        continue;
                    }

                    if (qteArrivage != null) {
                        if (qteArrivage.signum() > 0) {
                            arrivages.add(buildArrivage(citerne, row, date, qteArrivage, userId));
                        } else {
                            addAnomaly(anomalies, sheetName, r,
                                    "quantité d'arrivage non positive: " + qteArrivage);
                        }
                    }

                    if (qteSortie != null && qteSortie.signum() > 0) {
                        sorties.add(buildSortie(citerne, row, date, qteSortie, userId, codesNonResolus));
                    } else if (qteArrivage == null) {
                        ignorees++;
                        if (qteSortie != null) {
                            addAnomaly(anomalies, sheetName, r,
                                    "quantité de sortie non positive: " + qteSortie);
                        }
                    }
                }
            }
        } catch (IOException e) {
            throw new BusinessException("Fichier Excel illisible: " + e.getMessage(), "IMPORT_FICHIER_INVALIDE", 400);
        }

        arrivageRepository.saveAll(arrivages);
        sortieRepository.saveAll(sorties);
        log.info("Import GASOIL: {} sorties, {} arrivages ({} lignes ignorées, {} codes non résolus)",
                sorties.size(), arrivages.size(), ignorees, codesNonResolus.size());

        return new ImportGasoilReport(sorties.size(), arrivages.size(),
                (int) sortiesSupprimees, (int) arrivagesSupprimes,
                ignorees, codesNonResolus, anomalies);
    }

    private Arrivage buildArrivage(Citerne citerne, Row row, LocalDate date, BigDecimal qte, Long userId) {
        Arrivage a = new Arrivage();
        a.setCiterneId(citerne.getId());
        a.setDateArrivage(date);
        a.setNumeroBl(readString(row.getCell(2)));
        a.setQuantiteLitres(qte);
        BigDecimal pu = readNumber(row.getCell(4));
        if (pu != null && pu.signum() > 0) {
            a.setPrixUnitaireHt(pu);
            a.setValeurHt(qte.multiply(pu).setScale(2, RoundingMode.HALF_UP));
        }
        a.setSource("IMPORT");
        a.setCreatedBy(userId);
        return a;
    }

    private SortieCarburant buildSortie(Citerne citerne, Row row, LocalDate date, BigDecimal qte,
                                        Long userId, Map<String, Integer> codesNonResolus) {
        SortieCarburant s = new SortieCarburant();
        s.setCiterneId(citerne.getId());
        s.setDateSortie(date);
        s.setTotaliseur(readNumber(row.getCell(0)));
        s.setQuantiteLitres(qte);
        s.setTypeMouvement("SORTIE");
        s.setCompteur(readNumber(row.getCell(9)));
        s.setDemandeur(readString(row.getCell(10)));
        s.setNumeroBs(readString(row.getCell(11)));
        s.setSource("IMPORT");
        s.setCreatedBy(userId);

        String destination = readString(row.getCell(7));
        String code = readString(row.getCell(8));
        boolean numericCode = code != null && code.chars().allMatch(Character::isDigit);

        if (code == null || code.equals("-")) {
            s.setVehiculeCode(null);
            s.setTiers(false);
        } else if (numericCode) {
            s.setVehiculeCode(code);
            s.setTiers(false);
            Optional<Long> vehiculeId = vehiculeLookup.resolveByCode(code).map(v -> v.getId());
            if (vehiculeId.isPresent()) {
                s.setVehiculeId(vehiculeId.get());
            } else {
                codesNonResolus.merge(code, 1, Integer::sum);
            }
        } else {
            // text code = third-party client (ARMABETON, KF, SINASTONE…)
            s.setVehiculeCode(code.length() > 20 ? code.substring(0, 20) : code);
            s.setTiers(true);
        }

        if (destination == null || destination.isBlank()) {
            destination = code != null ? code : "—";
        }
        s.setDestination(destination);
        return s;
    }

    private void addAnomaly(List<String> anomalies, String sheet, int rowIdx, String message) {
        if (anomalies.size() < MAX_ANOMALIES) {
            anomalies.add(sheet + " ligne " + (rowIdx + 1) + " : " + message);
        }
    }

    private boolean isBlankRow(Row row) {
        for (int c = 0; c < 14; c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                if (cell.getCellType() == CellType.STRING && cell.getStringCellValue().isBlank()) continue;
                return false;
            }
        }
        return true;
    }

    private LocalDate readDate(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                return cell.getLocalDateTimeCellValue().toLocalDate();
            }
        } catch (RuntimeException e) {
            return null;
        }
        return null;
    }

    private BigDecimal readNumber(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && !DateUtil.isCellDateFormatted(cell)) {
                return BigDecimal.valueOf(cell.getNumericCellValue()).setScale(2, RoundingMode.HALF_UP);
            }
            if (cell.getCellType() == CellType.STRING) {
                String raw = cell.getStringCellValue().trim().replace(',', '.');
                if (raw.matches("-?\\d+(\\.\\d+)?")) {
                    return new BigDecimal(raw).setScale(2, RoundingMode.HALF_UP);
                }
            }
        } catch (RuntimeException e) {
            return null;
        }
        return null;
    }

    private String readString(Cell cell) {
        if (cell == null) return null;
        String value = switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            default -> null;
        };
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private BigDecimal firstPositive(BigDecimal first, BigDecimal second) {
        if (first != null && first.signum() > 0) return first;
        return second;
    }
}
