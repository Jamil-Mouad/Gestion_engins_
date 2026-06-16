package ma.intersig.fleetcore.service;

import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.time.format.DateTimeFormatter;

/** Shared layout helpers for the printable fiches (pneu, composant, vehicule). */
@Service
public class FichePdfSupport {

    private static final Logger log = LoggerFactory.getLogger(FichePdfSupport.class);

    public static final Color HEADER_BG = new Color(0xF5, 0x7C, 0x00);
    public static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    public static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public Image loadLogo() {
        try (var in = getClass().getResourceAsStream("/images/logo.png")) {
            if (in == null) {
                return null;
            }
            return Image.getInstance(in.readAllBytes());
        } catch (Exception e) {
            log.warn("fiche: could not load logo: {}", e.getMessage());
            return null;
        }
    }

    public Paragraph section(String text, Font font) {
        Paragraph p = new Paragraph(text, font);
        p.setSpacingBefore(12);
        p.setSpacingAfter(4);
        return p;
    }

    public PdfPTable kvTable(Font labelFont, Font valueFont, String... kv) {
        PdfPTable table = new PdfPTable(new float[]{2f, 3f});
        table.setWidthPercentage(70);
        table.setHorizontalAlignment(Element.ALIGN_LEFT);
        for (int i = 0; i < kv.length; i += 2) {
            table.addCell(cell(kv[i], labelFont));
            table.addCell(cell(kv[i + 1], valueFont));
        }
        return table;
    }

    public PdfPCell cell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "—", font));
        cell.setPadding(4);
        cell.setBorderColor(new Color(0xDD, 0xDD, 0xDD));
        return cell;
    }

    public String nv(String s) {
        return (s == null || s.isBlank()) ? "—" : s;
    }

    public String nvNum(Number n) {
        return n == null ? "—" : String.valueOf(n);
    }
}
