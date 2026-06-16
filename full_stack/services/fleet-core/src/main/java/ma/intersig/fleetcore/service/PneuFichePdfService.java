package ma.intersig.fleetcore.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import ma.intersig.fleetcore.entity.Pneu;
import ma.intersig.fleetcore.entity.PneuInspection;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.PneuInspectionRepository;
import ma.intersig.fleetcore.repository.PneuRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Builds the printable one-page « Fiche pneu » PDF: identity, mounting and
 * wear stats, photo when available, and the inspection history.
 */
@Service
public class PneuFichePdfService {

    private final PneuRepository pneuRepository;
    private final PneuInspectionRepository pneuInspectionRepository;
    private final FichePhotoLoader photoLoader;
    private final FichePdfSupport pdf;

    public PneuFichePdfService(PneuRepository pneuRepository,
                               PneuInspectionRepository pneuInspectionRepository,
                               FichePhotoLoader photoLoader,
                               FichePdfSupport pdf) {
        this.pneuRepository = pneuRepository;
        this.pneuInspectionRepository = pneuInspectionRepository;
        this.photoLoader = photoLoader;
        this.pdf = pdf;
    }

    @Transactional(readOnly = true)
    public byte[] generate(Long pneuId) {
        Pneu pneu = pneuRepository.findById(pneuId)
                .orElseThrow(() -> new ResourceNotFoundException("Pneu not found", "PNEU_NOT_FOUND"));
        List<PneuInspection> inspections = pneuInspectionRepository
                .findByPneuIdOrderByDateInspectionDesc(pneuId, Pageable.unpaged())
                .getContent();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 36, 36, 36, 36);
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            Image logo = pdf.loadLogo();
            if (logo != null) {
                logo.scaleToFit(150, 34);
                logo.setAlignment(Element.ALIGN_LEFT);
                doc.add(logo);
            }

            Paragraph title = new Paragraph("Fiche pneu — " + pdf.nv(pneu.getNSerie()), titleFont);
            title.setSpacingBefore(8);
            title.setSpacingAfter(12);
            doc.add(title);

            Image photo = photoLoader.load(pneu.getPhotoUrl());
            if (photo != null) {
                photo.scaleToFit(160, 160);
                photo.setAlignment(Element.ALIGN_RIGHT);
                doc.add(photo);
            }

            doc.add(pdf.section("Identité", sectionFont));
            PdfPTable identite = pdf.kvTable(labelFont, valueFont,
                    "N° série", pdf.nv(pneu.getNSerie()),
                    "Référence", pdf.nv(pneu.getReference()),
                    "Marque", pdf.nv(pneu.getMarque()),
                    "Véhicule", pneu.getVehicule() != null
                            ? pneu.getVehicule().getCode() + " (" + pneu.getVehicule().getType() + ")"
                            : "—",
                    "Position", pneu.getPosition() != null ? String.valueOf(pneu.getPosition()) : "—",
                    "Statut", pdf.nv(pneu.getStatus()),
                    "Actif", Boolean.TRUE.equals(pneu.getActif()) ? "Oui" : "Non");
            doc.add(identite);

            doc.add(pdf.section("Montage & usure", sectionFont));
            PdfPTable usure = pdf.kvTable(labelFont, valueFont,
                    "Date de montage", pneu.getDateMontage() != null
                            ? FichePdfSupport.DATE_FMT.format(pneu.getDateMontage()) : "—",
                    "Km au montage", pdf.nvNum(pneu.getKmMontage()),
                    "Km parcourus", pdf.nvNum(pneu.getKmParcourus()),
                    "Durée de vie prévue (km)", pdf.nvNum(pneu.getExpectedLifeKm()),
                    "Km restants", pdf.nvNum(pneu.getKmRestant()),
                    "Pression (PSI)", pneu.getPressionPsi() != null ? pneu.getPressionPsi().toPlainString() : "—",
                    "Profondeur (32e)", pneu.getProfondeur32e() != null
                            ? String.valueOf(pneu.getProfondeur32e()) : "—");
            doc.add(usure);

            doc.add(pdf.section("Historique des inspections", sectionFont));
            if (inspections.isEmpty()) {
                doc.add(new Paragraph("Aucune inspection enregistrée.", valueFont));
            } else {
                PdfPTable hist = new PdfPTable(new float[]{2.2f, 2f, 1.4f, 1.4f, 4f});
                hist.setWidthPercentage(100);
                hist.setSpacingBefore(4);
                for (String h : new String[]{"Date", "Activité", "Pression", "Profondeur", "Notes"}) {
                    PdfPCell cell = new PdfPCell(new Phrase(h, FontFactory.getFont(
                            FontFactory.HELVETICA_BOLD, 9, Color.WHITE)));
                    cell.setBackgroundColor(FichePdfSupport.HEADER_BG);
                    cell.setPadding(4);
                    hist.addCell(cell);
                }
                Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
                for (PneuInspection i : inspections) {
                    hist.addCell(pdf.cell(i.getDateInspection() != null
                            ? FichePdfSupport.DATETIME_FMT.format(i.getDateInspection()) : "—", cellFont));
                    hist.addCell(pdf.cell(pdf.nv(i.getActivity()), cellFont));
                    hist.addCell(pdf.cell(i.getPressionPsi() != null
                            ? i.getPressionPsi().toPlainString() : "—", cellFont));
                    hist.addCell(pdf.cell(i.getProfondeur32e() != null
                            ? String.valueOf(i.getProfondeur32e()) : "—", cellFont));
                    hist.addCell(pdf.cell(pdf.nv(i.getNotes()), cellFont));
                }
                doc.add(hist);
            }

            doc.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Failed to build fiche pneu PDF", e);
        }
        return out.toByteArray();
    }
}
