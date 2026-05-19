package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.request.CreateFournisseurRequest;
import ma.intersig.fleetcore.dto.response.FournisseurDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.entity.Fournisseur;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.FournisseurRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FournisseurService {

    private final FournisseurRepository fournisseurRepository;

    public FournisseurService(FournisseurRepository fournisseurRepository) {
        this.fournisseurRepository = fournisseurRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<FournisseurDto> list(String q, Pageable pageable) {
        Page<Fournisseur> page;
        if (q != null && !q.isBlank()) {
            page = fournisseurRepository.search(q, pageable);
        } else {
            page = fournisseurRepository.findByActifTrue(pageable);
        }
        return PageResponse.of(page.map(FournisseurDto::from));
    }

    @Transactional(readOnly = true)
    public FournisseurDto getById(Long id) {
        Fournisseur f = fournisseurRepository.findById(id)
                .filter(Fournisseur::getActif)
                .orElseThrow(() -> new ResourceNotFoundException("Fournisseur not found", "FOURNISSEUR_NOT_FOUND"));
        return FournisseurDto.from(f);
    }

    public FournisseurDto create(CreateFournisseurRequest req) {
        Fournisseur f = new Fournisseur();
        f.setNom(req.nom());
        f.setContact(req.contact());
        f.setEmail(req.email());
        f.setTel(req.tel());
        f.setIce(req.ice());
        f = fournisseurRepository.save(f);
        return FournisseurDto.from(f);
    }

    public FournisseurDto update(Long id, CreateFournisseurRequest req) {
        Fournisseur f = fournisseurRepository.findById(id)
                .filter(Fournisseur::getActif)
                .orElseThrow(() -> new ResourceNotFoundException("Fournisseur not found", "FOURNISSEUR_NOT_FOUND"));
        f.setNom(req.nom());
        f.setContact(req.contact());
        f.setEmail(req.email());
        f.setTel(req.tel());
        f.setIce(req.ice());
        f = fournisseurRepository.save(f);
        return FournisseurDto.from(f);
    }

    public void softDelete(Long id) {
        Fournisseur f = fournisseurRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fournisseur not found", "FOURNISSEUR_NOT_FOUND"));
        f.setActif(false);
        fournisseurRepository.save(f);
    }
}