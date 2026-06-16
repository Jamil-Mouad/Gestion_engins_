package ma.intersig.magasin.service;

import ma.intersig.magasin.dto.request.BaremeUpdateRequest;
import ma.intersig.magasin.dto.request.CiterneUpdateRequest;
import ma.intersig.magasin.dto.response.BaremeRowDto;
import ma.intersig.magasin.dto.response.CiterneDto;
import ma.intersig.magasin.dto.response.ConversionDto;
import ma.intersig.magasin.entity.BaremeJaugeage;
import ma.intersig.magasin.entity.Citerne;
import ma.intersig.magasin.exception.BusinessException;
import ma.intersig.magasin.exception.ResourceNotFoundException;
import ma.intersig.magasin.repository.BaremeJaugeageRepository;
import ma.intersig.magasin.repository.CiterneRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class CiterneService {

    private final CiterneRepository citerneRepository;
    private final BaremeJaugeageRepository baremeRepository;

    public CiterneService(CiterneRepository citerneRepository,
                          BaremeJaugeageRepository baremeRepository) {
        this.citerneRepository = citerneRepository;
        this.baremeRepository = baremeRepository;
    }

    @Transactional(readOnly = true)
    public Citerne getActive() {
        return citerneRepository.findFirstByActifTrueOrderByIdAsc()
                .orElseThrow(() -> new ResourceNotFoundException("Aucune citerne active", "CITERNE_NOT_FOUND"));
    }

    @Transactional(readOnly = true)
    public CiterneDto get() {
        return toDto(getActive());
    }

    @Transactional
    public CiterneDto update(CiterneUpdateRequest req) {
        Citerne citerne = getActive();
        citerne.setNom(req.nom());
        citerne.setCapaciteLitres(req.capaciteLitres());
        citerne.setDensiteKgParLitre(req.densiteKgParLitre());
        citerne.setHauteurMaxCm(req.hauteurMaxCm());
        citerne.setStockInitialLitres(req.stockInitialLitres());
        citerne.setStockInitialDate(req.stockInitialDate());
        return toDto(citerneRepository.save(citerne));
    }

    @Transactional(readOnly = true)
    public List<BaremeRowDto> getBareme() {
        Citerne citerne = getActive();
        return baremeRepository.findByCiterneIdOrderByHauteurCmAsc(citerne.getId()).stream()
                .map(r -> new BaremeRowDto(r.getId(), r.getHauteurCm(), r.getLitres()))
                .toList();
    }

    @Transactional
    public List<BaremeRowDto> replaceBareme(BaremeUpdateRequest req) {
        Citerne citerne = getActive();
        Set<BigDecimal> seen = new HashSet<>();
        for (BaremeUpdateRequest.Row row : req.rows()) {
            if (!seen.add(row.hauteurCm().stripTrailingZeros())) {
                throw new BusinessException(
                        "Hauteur dupliquée dans le barème: " + row.hauteurCm() + " cm",
                        "BAREME_DUPLICATE_HAUTEUR", 400);
            }
        }
        baremeRepository.deleteByCiterneId(citerne.getId());
        baremeRepository.flush();
        List<BaremeJaugeage> rows = req.rows().stream().map(r -> {
            BaremeJaugeage b = new BaremeJaugeage();
            b.setCiterneId(citerne.getId());
            b.setHauteurCm(r.hauteurCm());
            b.setLitres(r.litres());
            return b;
        }).toList();
        return baremeRepository.saveAll(rows).stream()
                .sorted((a, b) -> a.getHauteurCm().compareTo(b.getHauteurCm()))
                .map(r -> new BaremeRowDto(r.getId(), r.getHauteurCm(), r.getLitres()))
                .toList();
    }

    /**
     * Converts a ruler height into liters by linear interpolation between the
     * two barème rows bracketing the height. Below the lowest row, interpolates
     * from (0 cm, 0 L); above the highest row, the barème is incomplete → error.
     */
    @Transactional(readOnly = true)
    public BigDecimal convertHauteurToLitres(Citerne citerne, BigDecimal hauteurCm) {
        List<BaremeJaugeage> rows = baremeRepository.findByCiterneIdOrderByHauteurCmAsc(citerne.getId());
        if (rows.isEmpty()) {
            throw new BusinessException(
                    "Barème de jaugeage non configuré — saisissez-le dans l'écran d'administration",
                    "BAREME_EMPTY", 409);
        }
        BigDecimal prevH = BigDecimal.ZERO;
        BigDecimal prevL = BigDecimal.ZERO;
        for (BaremeJaugeage row : rows) {
            int cmp = hauteurCm.compareTo(row.getHauteurCm());
            if (cmp == 0) {
                return row.getLitres().setScale(2, RoundingMode.HALF_UP);
            }
            if (cmp < 0) {
                return interpolate(hauteurCm, prevH, prevL, row.getHauteurCm(), row.getLitres());
            }
            prevH = row.getHauteurCm();
            prevL = row.getLitres();
        }
        throw new BusinessException(
                "Hauteur " + hauteurCm + " cm au-dessus du barème (max " + prevH + " cm)",
                "BAREME_HAUTEUR_HORS_PLAGE", 400);
    }

    @Transactional(readOnly = true)
    public ConversionDto preview(BigDecimal hauteurCm) {
        Citerne citerne = getActive();
        BigDecimal litres = convertHauteurToLitres(citerne, hauteurCm);
        return new ConversionDto(hauteurCm, litres, toTonnes(litres, citerne));
    }

    public BigDecimal toTonnes(BigDecimal litres, Citerne citerne) {
        return litres.multiply(citerne.getDensiteKgParLitre())
                .divide(BigDecimal.valueOf(1000), 3, RoundingMode.HALF_UP);
    }

    private BigDecimal interpolate(BigDecimal h, BigDecimal h0, BigDecimal l0, BigDecimal h1, BigDecimal l1) {
        // l = l0 + (h - h0) * (l1 - l0) / (h1 - h0)
        BigDecimal span = h1.subtract(h0);
        if (span.signum() == 0) {
            return l1.setScale(2, RoundingMode.HALF_UP);
        }
        return l0.add(h.subtract(h0)
                        .multiply(l1.subtract(l0))
                        .divide(span, 6, RoundingMode.HALF_UP))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private CiterneDto toDto(Citerne c) {
        return new CiterneDto(c.getId(), c.getNom(), c.getCapaciteLitres(), c.getDensiteKgParLitre(),
                c.getHauteurMaxCm(), c.getStockInitialLitres(), c.getStockInitialDate());
    }
}
