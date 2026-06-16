package ma.intersig.magasin.service;

import ma.intersig.magasin.dto.request.ArrivageRequest;
import ma.intersig.magasin.dto.response.ArrivageDto;
import ma.intersig.magasin.entity.Arrivage;
import ma.intersig.magasin.entity.Citerne;
import ma.intersig.magasin.exception.ResourceNotFoundException;
import ma.intersig.magasin.repository.ArrivageRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

@Service
public class ArrivageService {

    private final ArrivageRepository arrivageRepository;
    private final CiterneService citerneService;

    public ArrivageService(ArrivageRepository arrivageRepository, CiterneService citerneService) {
        this.arrivageRepository = arrivageRepository;
        this.citerneService = citerneService;
    }

    @Transactional(readOnly = true)
    public Page<ArrivageDto> list(LocalDate dateMin, LocalDate dateMax, Pageable pageable) {
        Citerne citerne = citerneService.getActive();
        return arrivageRepository.search(citerne.getId(), dateMin, dateMax, pageable).map(this::toDto);
    }

    @Transactional
    public ArrivageDto create(ArrivageRequest req, Long userId) {
        Citerne citerne = citerneService.getActive();
        Arrivage a = new Arrivage();
        a.setCiterneId(citerne.getId());
        a.setCreatedBy(userId);
        apply(a, req);
        return toDto(arrivageRepository.save(a));
    }

    @Transactional
    public ArrivageDto update(Long id, ArrivageRequest req) {
        Arrivage a = arrivageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Arrivage introuvable: " + id, "ARRIVAGE_NOT_FOUND"));
        apply(a, req);
        return toDto(arrivageRepository.save(a));
    }

    @Transactional
    public void delete(Long id) {
        if (!arrivageRepository.existsById(id)) {
            throw new ResourceNotFoundException("Arrivage introuvable: " + id, "ARRIVAGE_NOT_FOUND");
        }
        arrivageRepository.deleteById(id);
    }

    private void apply(Arrivage a, ArrivageRequest req) {
        a.setDateArrivage(req.dateArrivage());
        a.setNumeroBl(req.numeroBl());
        a.setQuantiteLitres(req.quantiteLitres());
        a.setPrixUnitaireHt(req.prixUnitaireHt());
        a.setValeurHt(req.prixUnitaireHt() == null ? null
                : req.quantiteLitres().multiply(req.prixUnitaireHt()).setScale(2, RoundingMode.HALF_UP));
        a.setFournisseur(req.fournisseur());
    }

    private ArrivageDto toDto(Arrivage a) {
        return new ArrivageDto(a.getId(), a.getDateArrivage(), a.getNumeroBl(), a.getQuantiteLitres(),
                a.getPrixUnitaireHt(), a.getValeurHt(), a.getFournisseur(), a.getSource());
    }
}
