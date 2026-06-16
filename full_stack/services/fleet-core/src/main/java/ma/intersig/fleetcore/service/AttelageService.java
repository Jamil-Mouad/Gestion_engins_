package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.request.CreateAttelageRequest;
import ma.intersig.fleetcore.dto.request.TerminateAttelageRequest;
import ma.intersig.fleetcore.dto.response.AttelageDto;
import ma.intersig.fleetcore.entity.TracteurSemiAssignment;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.event.EntityChangedEvent;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.TracteurSemiAssignmentRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class AttelageService {

    private final TracteurSemiAssignmentRepository repo;
    private final VehiculeRepository vehiculeRepo;
    private final ApplicationEventPublisher eventPublisher;

    public AttelageService(TracteurSemiAssignmentRepository repo,
                           VehiculeRepository vehiculeRepo,
                           ApplicationEventPublisher eventPublisher) {
        this.repo = repo;
        this.vehiculeRepo = vehiculeRepo;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    @CacheEvict(value = "vehicules", allEntries = true)
    public AttelageDto create(CreateAttelageRequest req) {
        Vehicule tracteur = vehiculeRepo.findById(req.tracteurId())
            .orElseThrow(() -> new ResourceNotFoundException("Tracteur not found", "VEHICLE_NOT_FOUND"));
        Vehicule semi = vehiculeRepo.findById(req.semiId())
            .orElseThrow(() -> new ResourceNotFoundException("Semi-remorque not found", "VEHICLE_NOT_FOUND"));

        if (!Set.of("camion", "camion_tracteur").contains(tracteur.getType()))
            throw new BusinessException("Le véhicule tracteur doit être de type camion ou camion_tracteur", "INVALID_VEHICLE_TYPE", 422);
        if (!"semi_remorque".equals(semi.getType()))
            throw new BusinessException("Le véhicule semi doit être de type semi_remorque", "INVALID_VEHICLE_TYPE", 422);
        if (repo.existsByTracteurIdAndDateFinIsNullAndActifTrue(req.tracteurId()))
            throw new BusinessException("Ce tracteur a déjà une semi-remorque attelée", "TRACTEUR_ALREADY_ASSIGNED", 422);
        if (repo.existsBySemiIdAndDateFinIsNullAndActifTrue(req.semiId()))
            throw new BusinessException("Cette semi-remorque est déjà attelée à un autre tracteur", "SEMI_ALREADY_ASSIGNED", 422);

        TracteurSemiAssignment a = new TracteurSemiAssignment();
        a.setTracteur(tracteur);
        a.setSemi(semi);
        a.setDateDebut(req.dateDebut());

        a = repo.save(a);
        eventPublisher.publishEvent(new EntityChangedEvent(this, "attelage", a.getId(), "create"));
        return AttelageDto.from(a);
    }

    @Transactional
    @CacheEvict(value = "vehicules", allEntries = true)
    public AttelageDto terminate(Long id, TerminateAttelageRequest req) {
        TracteurSemiAssignment a = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Attelage not found", "ATTELAGE_NOT_FOUND"));
        if (a.getDateFin() != null)
            throw new BusinessException("Cet attelage est déjà terminé", "ATTELAGE_ALREADY_TERMINATED", 422);
        a.setDateFin(req.dateFin());
        a = repo.save(a);
        eventPublisher.publishEvent(new EntityChangedEvent(this, "attelage", a.getId(), "update"));
        return AttelageDto.from(a);
    }

    @Transactional
    @CacheEvict(value = "vehicules", allEntries = true)
    public void delete(Long id) {
        TracteurSemiAssignment a = repo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Attelage not found", "ATTELAGE_NOT_FOUND"));
        a.setActif(false);
        repo.save(a);
        eventPublisher.publishEvent(new EntityChangedEvent(this, "attelage", id, "delete"));
    }

    public List<AttelageDto> listByTracteur(Long tracteurId) {
        return repo.findByTracteurIdAndActifTrueOrderByDateDebutDesc(tracteurId)
            .stream().map(AttelageDto::from).toList();
    }

    public List<AttelageDto> listBySemi(Long semiId) {
        return repo.findBySemiIdAndActifTrueOrderByDateDebutDesc(semiId)
            .stream().map(AttelageDto::from).toList();
    }
}
