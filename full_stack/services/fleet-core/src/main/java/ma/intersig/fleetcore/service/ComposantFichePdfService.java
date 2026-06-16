package ma.intersig.fleetcore.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import ma.intersig.fleetcore.entity.Composant;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.ComposantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;

/** Builds the printable « Fiche composant » PDF: identity, catalog and stock data. */
@Service
public class ComposantFichePdfService {

    private final ComposantRepository composantRepository;
    private final FichePhotoLoader photoLoader;
    private final FichePdfSupport pdf;

    public ComposantFichePdfService(ComposantRepository composantRepository,
                                    FichePhotoLoader photoLoader,
                                    FichePdfSupport pdf) {
        this.composantRepository = composantRepository;
        this.photoLoader = photoLoader;
        this.pdf = pdf;
    }

    @Transactional(readOnly = true)
    public byte[] generate(Long composantId) {
        Composant c = composantRepository.findById(composantId)
                .orElseThrow(() -> new ResourceNotFoundException("Composant not found", "COMPOSANT_NOT_FOUND"));

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

            Paragraph title = new Paragraph("Fiche composant — " + pdf.nv(c.getDesignation()), titleFont);
            title.setSpacingBefore(8);
            title.setSpacingAfter(12);
            doc.add(title);

            Image photo = photoLoader.load(c.getImageUrl());
            if (photo != null) {
                photo.scaleToFit(160, 160);
                photo.setAlignment(Element.ALIGN_RIGHT);
                doc.add(photo);
            }

            doc.add(pdf.section("Identité", sectionFont));
            PdfPTable identite = pdf.kvTable(labelFont, valueFont,
                    "Désignation", pdf.nv(c.getDesignation()),
                    "Référence", pdf.nv(c.getReference()),
                    "Marque", pdf.nv(c.getMarque()),
                    "Catégorie", pdf.nv(c.getCategorie()),
                    "Parent", c.getParent() != null ? pdf.nv(c.getParent().getDesignation()) : "—",
                    "Véhicule", c.getVehicule() != null
                            ? c.getVehicule().getCode() + " (" + c.getVehicule().getType() + ")"
                            : "Modèle (template)",
                    "Actif", Boolean.TRUE.equals(c.getActif()) ? "Oui" : "Non");
            doc.add(identite);

            doc.add(pdf.section("Stock & prix", sectionFont));
            PdfPTable stock = pdf.kvTable(labelFont, valueFont,
                    "Unité", pdf.nv(c.getUnite()),
                    "Prix unitaire", c.getPrixUnitaire() != null ? c.getPrixUnitaire().toPlainString() : "—",
                    "Stock", pdf.nvNum(c.getStock()));
            doc.add(stock);

            doc.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Failed to build fiche composant PDF", e);
        }
        return out.toByteArray();
    }
}
