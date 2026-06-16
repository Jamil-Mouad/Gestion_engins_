package ma.intersig.magasin.api;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ExportMagasinApiTest extends ApiTestBase {

    private void seedData() {
        asRole("MAGASIN")
                .contentType("application/json")
                .body(Map.of("dateArrivage", "2025-03-01", "quantiteLitres", 5000, "numeroBl", "BL-77"))
                .post("/arrivages")
                .then().statusCode(201);
        Long vehiculeId = insertVehicule("D31", "camion", 120000);
        asRole("MAGASIN")
                .contentType("application/json")
                .body(Map.of("dateSortie", "2025-03-05", "quantiteLitres", 250,
                        "typeMouvement", "SORTIE", "destination", "CHANTIER NORD",
                        "vehiculeId", vehiculeId, "demandeur", "ALAMI"))
                .post("/sorties")
                .then().statusCode(201);
    }

    private XSSFWorkbook export(String query) throws IOException {
        byte[] bytes = asRole("ADMIN")
                .get("/export/excel?" + query)
                .then().statusCode(200)
                .extract().asByteArray();
        return new XSSFWorkbook(new ByteArrayInputStream(bytes));
    }

    @Test
    void sortiesExport_honorsSelectedColumns() throws IOException {
        seedData();
        try (XSSFWorkbook wb = export("entites=sorties&columns=date&columns=quantite")) {
            XSSFSheet sheet = wb.getSheet("Sorties");
            assertThat(sheet).isNotNull();
            Row header = sheet.getRow(0);
            assertThat(header.getLastCellNum()).isEqualTo((short) 2);
            assertThat(header.getCell(0).getStringCellValue()).isEqualTo("Date");
            assertThat(header.getCell(1).getStringCellValue()).isEqualTo("Quantité (L)");
            assertThat(sheet.getRow(1).getCell(1).getNumericCellValue()).isEqualTo(250.0);
        }
    }

    @Test
    void sortiesExport_unknownColumns_fallBackToAll() throws IOException {
        seedData();
        try (XSSFWorkbook wb = export("entites=sorties&columns=bogus")) {
            Row header = wb.getSheet("Sorties").getRow(0);
            assertThat(header.getLastCellNum()).isEqualTo((short) 11);
        }
    }

    @Test
    void arrivagesExport_honorsSelectedColumns() throws IOException {
        seedData();
        try (XSSFWorkbook wb = export("entites=arrivages&columns=date&columns=numero_bl&columns=quantite")) {
            XSSFSheet sheet = wb.getSheet("Arrivages");
            Row header = sheet.getRow(0);
            assertThat(header.getLastCellNum()).isEqualTo((short) 3);
            assertThat(header.getCell(1).getStringCellValue()).isEqualTo("N° BL");
            assertThat(sheet.getRow(1).getCell(1).getStringCellValue()).isEqualTo("BL-77");
        }
    }

    @Test
    void kpisExport_containsNativeCharts() throws IOException {
        seedData();
        try (XSSFWorkbook wb = export("entites=kpis&month=2025-03")) {
            XSSFSheet sheet = wb.getSheet("KPIs 2025-03");
            assertThat(sheet).isNotNull();
            assertThat(sheet.getDrawingPatriarch()).isNotNull();
            assertThat(sheet.getDrawingPatriarch().getCharts()).isNotEmpty();
        }
    }

    @Test
    void kpisExport_noData_producesValidWorkbookWithoutCharts() throws IOException {
        // Empty series must be skipped, not written as zero-length chart ranges.
        try (XSSFWorkbook wb = export("entites=kpis&month=2025-03")) {
            XSSFSheet sheet = wb.getSheet("KPIs 2025-03");
            assertThat(sheet).isNotNull();
        }
    }
}
