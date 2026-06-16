package ma.intersig.magasin.service;

import ma.intersig.magasin.dto.response.DashboardKpiDto;
import ma.intersig.magasin.dto.response.VehiculeKpiDto;
import ma.intersig.magasin.entity.Arrivage;
import ma.intersig.magasin.entity.Citerne;
import ma.intersig.magasin.entity.Jaugeage;
import ma.intersig.magasin.entity.SortieCarburant;
import ma.intersig.magasin.repository.ArrivageRepository;
import ma.intersig.magasin.repository.JaugeageRepository;
import ma.intersig.magasin.repository.SortieCarburantRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xddf.usermodel.chart.AxisPosition;
import org.apache.poi.xddf.usermodel.chart.BarDirection;
import org.apache.poi.xddf.usermodel.chart.ChartTypes;
import org.apache.poi.xddf.usermodel.chart.LegendPosition;
import org.apache.poi.xddf.usermodel.chart.XDDFBarChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFCategoryAxis;
import org.apache.poi.xddf.usermodel.chart.XDDFChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSourcesFactory;
import org.apache.poi.xddf.usermodel.chart.XDDFNumericalDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFPieChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFValueAxis;
import org.apache.poi.xssf.usermodel.XSSFChart;
import org.apache.poi.xssf.usermodel.XSSFClientAnchor;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class ExportMagasinService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    static final List<String> SORTIE_ALL_COLS = List.of(
            "date", "vehicule_code", "destination", "type", "quantite",
            "totaliseur", "compteur", "demandeur", "numero_bs", "tiers", "source");
    private static final Map<String, String> SORTIE_HEADERS = Map.ofEntries(
            Map.entry("date", "Date"),
            Map.entry("vehicule_code", "Code véhicule"),
            Map.entry("destination", "Destination"),
            Map.entry("type", "Type"),
            Map.entry("quantite", "Quantité (L)"),
            Map.entry("totaliseur", "Totaliseur"),
            Map.entry("compteur", "Compteur"),
            Map.entry("demandeur", "Demandeur"),
            Map.entry("numero_bs", "N° BS"),
            Map.entry("tiers", "Tiers"),
            Map.entry("source", "Source"));

    static final List<String> ARRIVAGE_ALL_COLS = List.of(
            "date", "numero_bl", "quantite", "prix_unitaire", "valeur_ht", "fournisseur", "source");
    private static final Map<String, String> ARRIVAGE_HEADERS = Map.of(
            "date", "Date",
            "numero_bl", "N° BL",
            "quantite", "Quantité (L)",
            "prix_unitaire", "PU HT (DH/L)",
            "valeur_ht", "Valeur HT (DH)",
            "fournisseur", "Fournisseur",
            "source", "Source");

    // Chart data lives in spare columns to the right of the per-vehicle KPI table.
    private static final int CHART_DATA_COL = 10;

    private final CiterneService citerneService;
    private final KpiMagasinService kpiService;
    private final SortieCarburantRepository sortieRepository;
    private final ArrivageRepository arrivageRepository;
    private final JaugeageRepository jaugeageRepository;

    public ExportMagasinService(CiterneService citerneService,
                                KpiMagasinService kpiService,
                                SortieCarburantRepository sortieRepository,
                                ArrivageRepository arrivageRepository,
                                JaugeageRepository jaugeageRepository) {
        this.citerneService = citerneService;
        this.kpiService = kpiService;
        this.sortieRepository = sortieRepository;
        this.arrivageRepository = arrivageRepository;
        this.jaugeageRepository = jaugeageRepository;
    }

    public byte[] exportExcel(List<String> entites, LocalDate dateMin, LocalDate dateMax,
                              YearMonth month, List<String> columns) throws IOException {
        Citerne citerne = citerneService.getActive();
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            if (entites.contains("sorties")) {
                writeSortiesSheet(workbook, citerne, dateMin, dateMax,
                        resolveColumns(columns, SORTIE_ALL_COLS));
            }
            if (entites.contains("arrivages")) {
                writeArrivagesSheet(workbook, citerne, dateMin, dateMax,
                        resolveColumns(columns, ARRIVAGE_ALL_COLS));
            }
            if (entites.contains("jaugeages")) {
                writeJaugeagesSheet(workbook, citerne);
            }
            if (entites.contains("kpis")) {
                writeKpisSheet(workbook, month);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private static List<String> resolveColumns(List<String> requested, List<String> allCols) {
        if (requested == null || requested.isEmpty()) {
            return allCols;
        }
        List<String> filtered = requested.stream().filter(allCols::contains).toList();
        return filtered.isEmpty() ? allCols : filtered;
    }

    private void writeSortiesSheet(XSSFWorkbook workbook, Citerne citerne,
                                   LocalDate dateMin, LocalDate dateMax, List<String> cols) {
        Sheet sheet = workbook.createSheet("Sorties");
        writeHeader(sheet, cols.stream().map(SORTIE_HEADERS::get).toArray(String[]::new));
        List<SortieCarburant> sorties = sortieRepository
                .search(citerne.getId(), dateMin, dateMax, null, null,
                        Pageable.unpaged(Sort.by(Sort.Direction.DESC, "dateSortie", "id")))
                .getContent();
        int rowIdx = 1;
        for (SortieCarburant s : sorties) {
            Row row = sheet.createRow(rowIdx++);
            for (int i = 0; i < cols.size(); i++) {
                switch (cols.get(i)) {
                    case "date" -> row.createCell(i).setCellValue(s.getDateSortie().format(DATE_FMT));
                    case "vehicule_code" -> row.createCell(i).setCellValue(orEmpty(s.getVehiculeCode()));
                    case "destination" -> row.createCell(i).setCellValue(orEmpty(s.getDestination()));
                    case "type" -> row.createCell(i).setCellValue(orEmpty(s.getTypeMouvement()));
                    case "quantite" -> setNumber(row, i, s.getQuantiteLitres());
                    case "totaliseur" -> setNumber(row, i, s.getTotaliseur());
                    case "compteur" -> setNumber(row, i, s.getCompteur());
                    case "demandeur" -> row.createCell(i).setCellValue(orEmpty(s.getDemandeur()));
                    case "numero_bs" -> row.createCell(i).setCellValue(orEmpty(s.getNumeroBs()));
                    case "tiers" -> row.createCell(i).setCellValue(Boolean.TRUE.equals(s.getTiers()) ? "Oui" : "Non");
                    case "source" -> row.createCell(i).setCellValue(orEmpty(s.getSource()));
                    default -> row.createCell(i).setCellValue("");
                }
            }
        }
    }

    private void writeArrivagesSheet(XSSFWorkbook workbook, Citerne citerne,
                                     LocalDate dateMin, LocalDate dateMax, List<String> cols) {
        Sheet sheet = workbook.createSheet("Arrivages");
        writeHeader(sheet, cols.stream().map(ARRIVAGE_HEADERS::get).toArray(String[]::new));
        List<Arrivage> arrivages = arrivageRepository
                .search(citerne.getId(), dateMin, dateMax,
                        Pageable.unpaged(Sort.by(Sort.Direction.DESC, "dateArrivage", "id")))
                .getContent();
        int rowIdx = 1;
        for (Arrivage a : arrivages) {
            Row row = sheet.createRow(rowIdx++);
            for (int i = 0; i < cols.size(); i++) {
                switch (cols.get(i)) {
                    case "date" -> row.createCell(i).setCellValue(a.getDateArrivage().format(DATE_FMT));
                    case "numero_bl" -> row.createCell(i).setCellValue(orEmpty(a.getNumeroBl()));
                    case "quantite" -> setNumber(row, i, a.getQuantiteLitres());
                    case "prix_unitaire" -> setNumber(row, i, a.getPrixUnitaireHt());
                    case "valeur_ht" -> setNumber(row, i, a.getValeurHt());
                    case "fournisseur" -> row.createCell(i).setCellValue(orEmpty(a.getFournisseur()));
                    case "source" -> row.createCell(i).setCellValue(orEmpty(a.getSource()));
                    default -> row.createCell(i).setCellValue("");
                }
            }
        }
    }

    private void writeJaugeagesSheet(XSSFWorkbook workbook, Citerne citerne) {
        Sheet sheet = workbook.createSheet("Jaugeages");
        writeHeader(sheet, "Date", "Hauteur (cm)", "Mesuré (L)", "Théorique (L)", "Écart (L)");
        List<Jaugeage> jaugeages = jaugeageRepository
                .findByCiterneIdOrderByDateJaugeageDesc(citerne.getId(), Pageable.unpaged())
                .getContent();
        int rowIdx = 1;
        for (Jaugeage j : jaugeages) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(j.getDateJaugeage().format(DATE_FMT));
            setNumber(row, 1, j.getHauteurCm());
            setNumber(row, 2, j.getLitresMesures());
            setNumber(row, 3, j.getLitresTheoriques());
            setNumber(row, 4, j.getEcartLitres());
        }
    }

    private void writeKpisSheet(XSSFWorkbook workbook, YearMonth month) {
        XSSFSheet sheet = workbook.createSheet("KPIs " + month);
        DashboardKpiDto dash = kpiService.dashboard(month);

        // Fleet summary block
        int rowIdx = 0;
        rowIdx = writeKeyValue(sheet, rowIdx, "Mois", month.toString());
        rowIdx = writeKeyValue(sheet, rowIdx, "Stock actuel (L)", dash.stockActuelLitres());
        rowIdx = writeKeyValue(sheet, rowIdx, "Stock actuel (t)", dash.stockActuelTonnes());
        rowIdx = writeKeyValue(sheet, rowIdx, "Capacité (L)", dash.capaciteLitres());
        rowIdx = writeKeyValue(sheet, rowIdx, "Conso. du mois (L)", dash.consoMoisLitres());
        rowIdx = writeKeyValue(sheet, rowIdx, "Conso. du mois (DH HT)", dash.consoMoisValeurHt());
        rowIdx = writeKeyValue(sheet, rowIdx, "Conso. moyenne / jour (L)", dash.consoMoyenneJourLitres());
        rowIdx = writeKeyValue(sheet, rowIdx, "Autonomie (jours)", dash.autonomieJours());
        rowIdx = writeKeyValue(sheet, rowIdx, "Arrivages de l'année (L)", dash.arrivagesAnneeLitres());
        rowIdx++;

        // Per-vehicle table
        Row header = sheet.createRow(rowIdx++);
        String[] cols = {"Code", "Type", "Voyages / mois", "KM parcourus", "KM cumulés",
                "Conso. (L)", "Conso. moyenne (L/100km)", "% conso (vs flotte)"};
        for (int i = 0; i < cols.length; i++) {
            header.createCell(i).setCellValue(cols[i]);
        }
        for (VehiculeKpiDto kpi : kpiService.allVehicules(month)) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(orEmpty(kpi.code()));
            row.createCell(1).setCellValue(orEmpty(kpi.type()));
            row.createCell(2).setCellValue(kpi.voyagesMois());
            setNumber(row, 3, kpi.kmParcourusMois());
            setNumber(row, 4, kpi.kmCumules());
            setNumber(row, 5, kpi.consoLitresMois());
            setNumber(row, 6, kpi.consoMoyenneL100());
            setNumber(row, 7, kpi.pctConsoVsFlotte());
        }

        writeKpiCharts(sheet, dash);
    }

    private void writeKpiCharts(XSSFSheet sheet, DashboardKpiDto dash) {
        int chartRow = 1;

        List<String> consoLabels = dash.consoParMois().stream().map(DashboardKpiDto.ConsoMois::mois).toList();
        List<BigDecimal> consoValues = dash.consoParMois().stream().map(DashboardKpiDto.ConsoMois::litres).toList();
        if (!consoLabels.isEmpty()) {
            int dataRow = writeChartData(sheet, CHART_DATA_COL, 0, "Mois", "Litres", consoLabels, consoValues);
            createBarChart(sheet, "Consommation — 12 derniers mois", BarDirection.COL,
                    CHART_DATA_COL, 1, dataRow - 1, chartRow);
            chartRow += 16;
        }

        List<String> repLabels = dash.repartitionParType().stream().map(DashboardKpiDto.RepartitionType::categorie).toList();
        List<BigDecimal> repValues = dash.repartitionParType().stream().map(DashboardKpiDto.RepartitionType::litres).toList();
        if (!repLabels.isEmpty()) {
            int dataRow = writeChartData(sheet, CHART_DATA_COL + 3, 0, "Type", "Litres", repLabels, repValues);
            createPieChart(sheet, "Répartition par type",
                    CHART_DATA_COL + 3, 1, dataRow - 1, chartRow);
            chartRow += 16;
        }

        List<DashboardKpiDto.TopConsommateur> top = dash.topConsommateurs().stream().limit(10).toList();
        if (!top.isEmpty()) {
            List<String> topLabels = top.stream().map(DashboardKpiDto.TopConsommateur::label).toList();
            List<BigDecimal> topValues = top.stream().map(DashboardKpiDto.TopConsommateur::litres).toList();
            int dataRow = writeChartData(sheet, CHART_DATA_COL + 6, 0, "Véhicule", "Litres", topLabels, topValues);
            createBarChart(sheet, "Top consommateurs", BarDirection.BAR,
                    CHART_DATA_COL + 6, 1, dataRow - 1, chartRow);
        }
    }

    /** Writes a labels/values column pair starting at (startRow, labelCol); returns the next free row. */
    private int writeChartData(XSSFSheet sheet, int labelCol, int startRow, String labelHeader,
                               String valueHeader, List<String> labels, List<BigDecimal> values) {
        Row head = getOrCreateRow(sheet, startRow);
        head.createCell(labelCol).setCellValue(labelHeader);
        head.createCell(labelCol + 1).setCellValue(valueHeader);
        int rowIdx = startRow + 1;
        for (int i = 0; i < labels.size(); i++) {
            Row row = getOrCreateRow(sheet, rowIdx++);
            row.createCell(labelCol).setCellValue(orEmpty(labels.get(i)));
            BigDecimal v = values.get(i);
            row.createCell(labelCol + 1).setCellValue(v != null ? v.doubleValue() : 0d);
        }
        return rowIdx;
    }

    private void createBarChart(XSSFSheet sheet, String title, BarDirection direction,
                                int labelCol, int firstDataRow, int lastDataRow, int anchorRow) {
        XSSFChart chart = newChart(sheet, title, anchorRow);
        XDDFCategoryAxis bottomAxis = chart.createCategoryAxis(AxisPosition.BOTTOM);
        XDDFValueAxis leftAxis = chart.createValueAxis(AxisPosition.LEFT);
        XDDFDataSource<String> cats = XDDFDataSourcesFactory.fromStringCellRange(sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, labelCol, labelCol));
        XDDFNumericalDataSource<Double> vals = XDDFDataSourcesFactory.fromNumericCellRange(sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, labelCol + 1, labelCol + 1));
        XDDFBarChartData data = (XDDFBarChartData) chart.createData(ChartTypes.BAR, bottomAxis, leftAxis);
        data.setBarDirection(direction);
        XDDFChartData.Series series = data.addSeries(cats, vals);
        series.setTitle(title, null);
        chart.plot(data);
    }

    private void createPieChart(XSSFSheet sheet, String title,
                                int labelCol, int firstDataRow, int lastDataRow, int anchorRow) {
        XSSFChart chart = newChart(sheet, title, anchorRow);
        chart.getOrAddLegend().setPosition(LegendPosition.RIGHT);
        XDDFDataSource<String> cats = XDDFDataSourcesFactory.fromStringCellRange(sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, labelCol, labelCol));
        XDDFNumericalDataSource<Double> vals = XDDFDataSourcesFactory.fromNumericCellRange(sheet,
                new CellRangeAddress(firstDataRow, lastDataRow, labelCol + 1, labelCol + 1));
        // Pie charts take no axes — passing them throws.
        XDDFPieChartData data = (XDDFPieChartData) chart.createData(ChartTypes.PIE, null, null);
        data.setVaryColors(true);
        XDDFChartData.Series series = data.addSeries(cats, vals);
        series.setTitle(title, null);
        chart.plot(data);
    }

    private XSSFChart newChart(XSSFSheet sheet, String title, int anchorRow) {
        XSSFDrawing drawing = sheet.createDrawingPatriarch();
        XSSFClientAnchor anchor = drawing.createAnchor(0, 0, 0, 0,
                CHART_DATA_COL + 9, anchorRow, CHART_DATA_COL + 18, anchorRow + 15);
        XSSFChart chart = drawing.createChart(anchor);
        chart.setTitleText(title);
        chart.setTitleOverlay(false);
        return chart;
    }

    private Row getOrCreateRow(Sheet sheet, int rowIdx) {
        Row row = sheet.getRow(rowIdx);
        return row != null ? row : sheet.createRow(rowIdx);
    }

    private void writeHeader(Sheet sheet, String... cols) {
        Row header = sheet.createRow(0);
        for (int i = 0; i < cols.length; i++) {
            header.createCell(i).setCellValue(cols[i]);
        }
    }

    private int writeKeyValue(Sheet sheet, int rowIdx, String label, Object value) {
        Row row = sheet.createRow(rowIdx);
        row.createCell(0).setCellValue(label);
        if (value instanceof BigDecimal bd) {
            row.createCell(1).setCellValue(bd.doubleValue());
        } else if (value != null) {
            row.createCell(1).setCellValue(value.toString());
        } else {
            row.createCell(1).setCellValue("—");
        }
        return rowIdx + 1;
    }

    private void setNumber(Row row, int col, BigDecimal value) {
        if (value != null) {
            row.createCell(col).setCellValue(value.doubleValue());
        } else {
            row.createCell(col).setCellValue("");
        }
    }

    private String orEmpty(String value) {
        return value != null ? value : "";
    }
}
