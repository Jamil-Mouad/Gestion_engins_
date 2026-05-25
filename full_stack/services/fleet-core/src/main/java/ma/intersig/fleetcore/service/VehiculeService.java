package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.request.CreateVehiculeRequest;
import ma.intersig.fleetcore.dto.request.UpdateVehiculeRequest;
import ma.intersig.fleetcore.dto.response.AttelageDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.dto.response.VehiculeDto;
import ma.intersig.fleetcore.entity.Camion;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.event.EntityChangedEvent;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.TracteurSemiAssignmentRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@Transactional
public class VehiculeService {

    private static final Set<String> VALID_STATUTS = Set.of(
            "in-service", "workshop", "maintenance", "out-of-service"
    );

    private static boolean isCamionType(String type) {
        return "camion".equalsIgnoreCase(type) || "camion_tracteur".equalsIgnoreCase(type);
    }

    private final VehiculeRepository vehiculeRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TracteurSemiAssignmentRepository attelageRepo;

    public VehiculeService(VehiculeRepository vehiculeRepository,
                           ApplicationEventPublisher eventPublisher,
                           TracteurSemiAssignmentRepository attelageRepo) {
        this.vehiculeRepository = vehiculeRepository;
        this.eventPublisher = eventPublisher;
        this.attelageRepo = attelageRepo;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "vehicules-page", key = "#q + '-' + #type + '-' + #statut + '-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort")
    public PageResponse<VehiculeDto> list(String q, String type, String statut, Pageable pageable) {
        Page<Vehicule> page;
        String qNorm = (q != null && !q.isBlank()) ? q : null;
        if (qNorm != null || type != null || statut != null) {
            page = vehiculeRepository.searchWithFilters(qNorm, type, statut, pageable);
        } else {
            page = vehiculeRepository.findByActifTrue(pageable);
        }
        return PageResponse.of(page.map(VehiculeDto::fromList));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "vehicules", key = "#id")
    public VehiculeDto getById(Long id) {
        Vehicule v = vehiculeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));

        AttelageDto currentAttelage = null;
        if (isCamionType(v.getType())) {
            currentAttelage = attelageRepo
                .findByTracteurIdAndDateFinIsNullAndActifTrue(id)
                .map(AttelageDto::from)
                .orElse(null);
        } else if ("semi_remorque".equals(v.getType())) {
            currentAttelage = attelageRepo
                .findBySemiIdAndDateFinIsNullAndActifTrue(id)
                .map(AttelageDto::from)
                .orElse(null);
        }

        return VehiculeDto.from(v, currentAttelage);
    }

    @CacheEvict(value = {"vehicules-page", "vehicules"}, allEntries = true)
    public VehiculeDto create(CreateVehiculeRequest req) {
        validateUniqueConstraints(req.code(), req.matricule(), req.nChassis(), null);

        if (isCamionType(req.type()) && req.camionDetails() == null) {
            throw new BusinessException("camionDetails is required when type is camion", "CAMION_DETAILS_REQUIRED", 422);
        }

        Vehicule vehicule = new Vehicule();
        mapRequestToEntity(req, vehicule);

        if (isCamionType(req.type()) && req.camionDetails() != null) {
            Camion camion = new Camion();
            mapBaseFields(req, camion);
            mapCamionDetails(req.camionDetails(), camion);
            if (req.camionDetails().compteurKm() != null) {
                camion.setCompteurKm(req.camionDetails().compteurKm());
            }
            if (req.camionDetails().compteurHeures() != null) {
                camion.setCompteurHeures(req.camionDetails().compteurHeures());
            }
            if (req.chauffeurPrenom() != null) {
                camion.setChauffeurPrenom(req.chauffeurPrenom());
            }
            if (req.chauffeurNom() != null) {
                camion.setChauffeurNom(req.chauffeurNom());
            }
            vehicule = vehiculeRepository.save(camion);
        } else {
            vehicule = vehiculeRepository.save(vehicule);
        }

        eventPublisher.publishEvent(new EntityChangedEvent(this, "vehicule", vehicule.getId(), "create"));
        return VehiculeDto.from(vehicule, null);
    }

    @CacheEvict(value = {"vehicules-page", "vehicules"}, allEntries = true)
    public VehiculeDto update(Long id, UpdateVehiculeRequest req) {
        Vehicule vehicule = vehiculeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));

        validateStatut(req.statut());
        validateUniqueConstraints(null, req.matricule(), req.nChassis(), id);
        vehicule.setMarque(req.marque());
        vehicule.setModele(req.modele());
        vehicule.setMatricule(req.matricule());
        vehicule.setNChassis(req.nChassis());
        vehicule.setAnnee(req.annee());
        vehicule.setCarburant(req.carburant());
        vehicule.setStatut(req.statut());
        vehicule.setDateMiseService(req.dateMiseService());
        vehicule.setPhotoUrl(req.photoUrl());

        if (vehicule instanceof Camion camion && req.camionDetails() != null) {
            mapCamionDetails(req.camionDetails(), camion);
            if (req.chauffeurPrenom() != null) {
                camion.setChauffeurPrenom(req.chauffeurPrenom());
            }
            if (req.chauffeurNom() != null) {
                camion.setChauffeurNom(req.chauffeurNom());
            }
        }

        vehicule = vehiculeRepository.save(vehicule);
        eventPublisher.publishEvent(new EntityChangedEvent(this, "vehicule", vehicule.getId(), "update"));
        return VehiculeDto.from(vehicule, null);
    }

    private void validateStatut(String statut) {
        if (!VALID_STATUTS.contains(statut)) {
            throw new BusinessException("Invalid statut value", "INVALID_STATUT", 422);
        }
    }

    @CacheEvict(value = {"vehicules-page", "vehicules"}, allEntries = true)
    public VehiculeDto patchStatut(Long id, String statut) {
        validateStatut(statut);
        Vehicule vehicule = vehiculeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));
        vehicule.setStatut(statut);
        vehicule = vehiculeRepository.save(vehicule);
        eventPublisher.publishEvent(new EntityChangedEvent(this, "vehicule", vehicule.getId(), "update"));
        return VehiculeDto.from(vehicule, null);
    }

    @CacheEvict(value = {"vehicules-page", "vehicules"}, allEntries = true)
    public void softDelete(Long id) {
        Vehicule vehicule = vehiculeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));
        vehicule.setActif(false);
        vehiculeRepository.save(vehicule);
        eventPublisher.publishEvent(new EntityChangedEvent(this, "vehicule", id, "delete"));
    }

    private void validateUniqueConstraints(String code, String matricule, String nChassis, Long excludeId) {
        if (code != null && !code.isBlank()) {
            vehiculeRepository.findByCodeAndIdNot(code, excludeId != null ? excludeId : -1L).ifPresent(v -> {
                throw new BusinessException("Code already exists", "CODE_ALREADY_EXISTS", 409);
            });
        }
        if (matricule != null && !matricule.isBlank()) {
            vehiculeRepository.findByMatriculeAndIdNot(matricule, excludeId != null ? excludeId : -1L).ifPresent(v -> {
                throw new BusinessException("Matricule already exists", "MATRICULE_ALREADY_EXISTS", 409);
            });
        }
        if (nChassis != null && !nChassis.isBlank()) {
            vehiculeRepository.findByNChassisAndIdNot(nChassis, excludeId != null ? excludeId : -1L).ifPresent(v -> {
                throw new BusinessException("Chassis number already exists", "CHASSIS_ALREADY_EXISTS", 409);
            });
        }
    }

    private void mapRequestToEntity(CreateVehiculeRequest req, Vehicule v) {
        mapBaseFields(req, v);
    }

    private void mapBaseFields(CreateVehiculeRequest req, Vehicule v) {
        validateStatut(req.statut());
        v.setCode(req.code());
        v.setType(req.type());
        v.setMarque(req.marque());
        v.setModele(req.modele());
        v.setMatricule(req.matricule());
        v.setNChassis(req.nChassis());
        v.setAnnee(req.annee());
        v.setCarburant(req.carburant());
        v.setStatut(req.statut());
        v.setDateMiseService(req.dateMiseService());
        v.setPhotoUrl(req.photoUrl());
    }

    @CacheEvict(value = {"vehicules-page", "vehicules"}, allEntries = true)
    public void updateCamionChauffeur(Long vehiculeId, String nom, String prenom) {
        Vehicule v = vehiculeRepository.findById(vehiculeId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));
        if (!(v instanceof Camion camion)) {
            throw new BusinessException("Vehicle is not a camion", "VEHICLE_TYPE_MISMATCH", 422);
        }
        if (nom != null) camion.setChauffeurNom(nom);
        if (prenom != null) camion.setChauffeurPrenom(prenom);
        vehiculeRepository.save(camion);
        eventPublisher.publishEvent(new EntityChangedEvent(this, "vehicule", vehiculeId, "update"));
    }

    private void mapCamionDetails(ma.intersig.fleetcore.dto.request.CamionDetailsRequest details, Camion c) {
        if (details.capaciteTonnes() != null) c.setCapaciteTonnes(details.capaciteTonnes());
        if (details.configAxle() != null) c.setConfigAxle(details.configAxle());
        if (details.visiteTechTracteurExpiration() != null) c.setVisiteTechTracteurExpiration(details.visiteTechTracteurExpiration());
        if (details.visiteTechSemiExpiration() != null) c.setVisiteTechSemiExpiration(details.visiteTechSemiExpiration());
        if (details.carnetCirculationExpiration() != null) c.setCarnetCirculationExpiration(details.carnetCirculationExpiration());
        if (details.metrologieExpiration() != null) c.setMetrologieExpiration(details.metrologieExpiration());
        if (details.extincteurExpiration() != null) c.setExtincteurExpiration(details.extincteurExpiration());
        if (details.batterieModele() != null) c.setBatterieModele(details.batterieModele());
        if (details.batterieDateAchat() != null) c.setBatterieDateAchat(details.batterieDateAchat());
        if (details.batterieDateControle() != null) c.setBatterieDateControle(details.batterieDateControle());
        if (details.consoGasoilLitresMois() != null) c.setConsoGasoilLitresMois(details.consoGasoilLitresMois());
    }
}
