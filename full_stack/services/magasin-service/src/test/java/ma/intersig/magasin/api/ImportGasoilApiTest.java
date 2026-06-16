package ma.intersig.magasin.api;

import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;

import static org.hamcrest.Matchers.*;

class ImportGasoilApiTest extends ApiTestBase {

    /**
     * Reduced fixture mirroring the real GASOIL 25 layout:
     * A totaliseur · C BL · D qté arrivage · E PU · G date · H destination ·
     * I code · J compteur · K demandeur · L n° BS · M qté sortie.
     */
    private byte[] buildFixture() throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle dateStyle = wb.createCellStyle();
            dateStyle.setDataFormat(wb.createDataFormat().getFormat("dd/mm/yyyy"));

            Sheet feuil1 = wb.createSheet("Feuil1");
            header(feuil1);
            // combined arrival + dispensing on the same row (real Jan 1 pattern)
            Row r1 = feuil1.createRow(1);
            r1.createCell(0).setCellValue(2874416);
            r1.createCell(3).setCellValue(15200);
            r1.createCell(4).setCellValue(9.0);
            date(r1, dateStyle, LocalDate.of(2025, 1, 1));
            r1.createCell(7).setCellValue(" MIT 11469A73");
            r1.createCell(8).setCellValue(951);
            r1.createCell(9).setCellValue(878784);
            r1.createCell(10).setCellValue("ABDELKHALEK");
            r1.createCell(11).setCellValue(201564);
            r1.createCell(12).setCellValue(68);
            // third-party dispensing (text code)
            Row r2 = feuil1.createRow(2);
            r2.createCell(0).setCellValue(2874724);
            date(r2, dateStyle, LocalDate.of(2025, 1, 2));
            r2.createCell(7).setCellValue(" SITRAK 70223D8");
            r2.createCell(8).setCellValue("ARMABETON");
            r2.createCell(12).setCellValue(308);
            // numeric code with no vehicules row (engin)
            Row r3 = feuil1.createRow(3);
            date(r3, dateStyle, LocalDate.of(2025, 1, 2));
            r3.createCell(7).setCellValue(" LINDE");
            r3.createCell(8).setCellValue(999);
            r3.createCell(12).setCellValue(25);
            // sheet-total garbage row (no date) → skipped
            Row r4 = feuil1.createRow(4);
            r4.createCell(0).setCellValue(663760986);
            r4.createCell(1).setCellValue(439559);

            Sheet nov = wb.createSheet("01112025");
            header(nov);
            // carry-over row (quantity, no date) → skipped
            Row n1 = nov.createRow(1);
            n1.createCell(0).setCellValue(3313902);
            n1.createCell(3).setCellValue(6250);
            // normal dispensing resolved to the vehicle
            Row n2 = nov.createRow(2);
            date(n2, dateStyle, LocalDate.of(2025, 11, 1));
            n2.createCell(7).setCellValue(" MIT 11469A73");
            n2.createCell(8).setCellValue(951);
            n2.createCell(9).setCellValue(953203);
            n2.createCell(12).setCellValue(180);

            wb.write(out);
            return out.toByteArray();
        }
    }

    private void header(Sheet sheet) {
        Row h = sheet.createRow(0);
        h.createCell(0).setCellValue("TOTALISTEUR");
        h.createCell(6).setCellValue("DATE");
    }

    private void date(Row row, CellStyle style, LocalDate value) {
        var cell = row.createCell(6);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    @Test
    void import_parsesArrivagesSortiesAndReportsUnresolvedCodes() throws IOException {
        insertVehicule("951", "camion", 0);
        byte[] fixture = buildFixture();

        asRole("ADMIN")
                .multiPart("file", "gasoil.xlsx", fixture,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .post("/import/gasoil")
                .then().statusCode(200)
                .body("arrivagesImportes", is(1))
                .body("sortiesImportees", is(4))
                .body("lignesIgnorees", is(2))
                .body("codesNonResolus.999", is(1));

        // resolved rows point at the vehicules row, tiers rows are flagged
        Integer resolved = jdbc.queryForObject(
                "SELECT COUNT(*) FROM sortie_carburant WHERE vehicule_id IS NOT NULL", Integer.class);
        Integer tiers = jdbc.queryForObject(
                "SELECT COUNT(*) FROM sortie_carburant WHERE tiers", Integer.class);
        org.junit.jupiter.api.Assertions.assertEquals(2, resolved);
        org.junit.jupiter.api.Assertions.assertEquals(1, tiers);

        // arrival kept its priced value
        asRole("MAGASIN").get("/arrivages")
                .then().statusCode(200)
                .body("content[0].quantiteLitres", is(15200.0f))
                .body("content[0].valeurHt", is(136800.0f));
    }

    @Test
    void import_isIdempotent_replacesPreviousImportButKeepsManualEntries() throws IOException {
        insertVehicule("951", "camion", 0);

        // one manual entry that must survive re-imports
        asRole("MAGASIN")
                .contentType("application/json")
                .body(java.util.Map.of("dateSortie", "2025-05-01", "quantiteLitres", 42,
                        "typeMouvement", "SORTIE", "destination", "MANUEL"))
                .post("/sorties").then().statusCode(201);

        byte[] fixture = buildFixture();
        asRole("ADMIN").multiPart("file", "gasoil.xlsx", fixture,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .post("/import/gasoil").then().statusCode(200)
                .body("sortiesSupprimees", is(0));

        asRole("ADMIN").multiPart("file", "gasoil.xlsx", fixture,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .post("/import/gasoil").then().statusCode(200)
                .body("sortiesSupprimees", is(4))
                .body("arrivagesSupprimes", is(1))
                .body("sortiesImportees", is(4));

        Integer manual = jdbc.queryForObject(
                "SELECT COUNT(*) FROM sortie_carburant WHERE source = 'SAISIE'", Integer.class);
        Integer imported = jdbc.queryForObject(
                "SELECT COUNT(*) FROM sortie_carburant WHERE source = 'IMPORT'", Integer.class);
        org.junit.jupiter.api.Assertions.assertEquals(1, manual);
        org.junit.jupiter.api.Assertions.assertEquals(4, imported);
    }

    @Test
    void import_requiresAdmin() throws IOException {
        asRole("MAGASIN")
                .multiPart("file", "gasoil.xlsx", buildFixture(),
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .post("/import/gasoil")
                .then().statusCode(403);
    }

    @Test
    void import_missingSheet_rejected() {
        byte[] empty;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.createSheet("Autre");
            wb.write(out);
            empty = out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        asRole("ADMIN")
                .multiPart("file", "gasoil.xlsx", empty,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .post("/import/gasoil")
                .then().statusCode(400)
                .body("code", is("IMPORT_FEUILLE_MANQUANTE"));
    }
}
