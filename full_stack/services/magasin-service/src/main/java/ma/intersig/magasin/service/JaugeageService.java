package ma.intersig.magasin.service;

import ma.intersig.magasin.dto.request.JaugeageRequest;
import ma.intersig.magasin.dto.response.JaugeageDto;
import ma.intersig.magasin.entity.Citerne;
import ma.intersig.magasin.entity.Jaugeage;
import ma.intersig.magasin.exception.BusinessException;
import ma.intersig.magasin.exception.ResourceNotFoundException;
import ma.intersig.magasin.repository.JaugeageRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class JaugeageService {

    private final JaugeageRepository jaugeageRepository;
    private final CiterneService citerneService;
    private final StockService stockService;

    public JaugeageService(JaugeageRepository jaugeageRepository,
                           CiterneService citerneService,
                           StockService stockService) {
        this.jaugeageRepository = jaugeageRepository;
        this.citerneService = citerneService;
        this.stockService = stockService;
    }

    @Transactional(readOnly = true)
    public Page<JaugeageDto> list(Pageable pageable) {
        Citerne citerne = citerneService.getActive();
        return jaugeageRepository.findByCiterneIdOrderByDateJaugeageDesc(citerne.getId(), pageable)
                .map(this::toDto);
    }

    @Transactional
    public JaugeageDto create(JaugeageRequest req, Long userId) {
        Citerne citerne = citerneService.getActive();
        jaugeageRepository.findByCiterneIdAndDateJaugeage(citerne.getId(), req.dateJaugeage())
                .ifPresent(j -> {
                    throw new BusinessException(
                            "Un jaugeage existe déjà pour le " + req.dateJaugeage(),
                            "JAUGEAGE_DEJA_SAISI", 409);
                });
        BigDecimal litresMesures = citerneService.convertHauteurToLitres(citerne, req.hauteurCm());
        BigDecimal litresTheoriques = stockService.stockTheorique(citerne, req.dateJaugeage());

        Jaugeage j = new Jaugeage();
        j.setCiterneId(citerne.getId());
        j.setDateJaugeage(req.dateJaugeage());
        j.setHauteurCm(req.hauteurCm());
        j.setLitresMesures(litresMesures);
        j.setLitresTheoriques(litresTheoriques);
        j.setEcartLitres(litresMesures.subtract(litresTheoriques));
        j.setCreatedBy(userId);
        return toDto(jaugeageRepository.save(j));
    }

    @Transactional
    public void delete(Long id) {
        if (!jaugeageRepository.existsById(id)) {
            throw new ResourceNotFoundException("Jaugeage introuvable: " + id, "JAUGEAGE_NOT_FOUND");
        }
        jaugeageRepository.deleteById(id);
    }

    private JaugeageDto toDto(Jaugeage j) {
        return new JaugeageDto(j.getId(), j.getDateJaugeage(), j.getHauteurCm(),
                j.getLitresMesures(), j.getLitresTheoriques(), j.getEcartLitres());
    }
}
