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
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;

/** Builds the printable « Fiche véhicule » PDF: identity and service data. */
@Service
public class VehiculeFichePdfService {

    private final VehiculeRepository vehiculeRepository;
    private final FichePhotoLoader photoLoader;
    private final FichePdfSupport pdf;

    public VehiculeFichePdfService(VehiculeRepository vehiculeRepository,
                                   FichePhotoLoader photoLoader,
                                   FichePdfSupport pdf) {
        this.vehiculeRepository = vehiculeRepository;
        this.photoLoader = photoLoader;
        this.pdf = pdf;
    }

    @Transactional(readOnly = true)
    public byte[] generate(Long vehiculeId) {
        Vehicule v = vehiculeRepository.findById(vehiculeId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicule not found", "VEHICULE_NOT_FOUND"));

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

            Paragraph title = new Paragraph(
                    "Fiche véhicule — " + pdf.nv(v.getCode()) + " (" + pdf.nv(v.getType()) + ")", titleFont);
            title.setSpacingBefore(8);
            title.setSpacingAfter(12);
            doc.add(title);

            Image photo = photoLoader.load(v.getPhotoUrl());
            if (photo != null) {
                photo.scaleToFit(160, 160);
                photo.setAlignment(Element.ALIGN_RIGHT);
                doc.add(photo);
            }

            doc.add(pdf.section("Identité", sectionFont));
            PdfPTable identite = pdf.kvTable(labelFont, valueFont,
                    "Code", pdf.nv(v.getCode()),
                    "Type", pdf.nv(v.getType()),
                    "Marque", pdf.nv(v.getMarque()),
                    "Modèle", pdf.nv(v.getModele()),
                    "Matricule", pdf.nv(v.getMatricule()),
                    "N° châssis", pdf.nv(v.getNChassis()),
                    "Actif", Boolean.TRUE.equals(v.getActif()) ? "Oui" : "Non");
            doc.add(identite);

            doc.add(pdf.section("Exploitation", sectionFont));
            PdfPTable expl = pdf.kvTable(labelFont, valueFont,
                    "Statut", pdf.nv(v.getStatut()),
                    "Carburant", pdf.nv(v.getCarburant()),
                    "Année", pdf.nvNum(v.getAnnee()),
                    "Date de mise en service", v.getDateMiseService() != null
                            ? FichePdfSupport.DATE_FMT.format(v.getDateMiseService()) : "—");
            doc.add(expl);

            doc.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Failed to build fiche vehicule PDF", e);
        }
        return out.toByteArray();
    }
}
