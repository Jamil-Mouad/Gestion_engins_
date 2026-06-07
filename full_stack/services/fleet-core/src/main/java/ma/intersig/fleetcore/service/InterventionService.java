package ma.intersig.fleetcore.service;

import jakarta.persistence.EntityManager;
import ma.intersig.fleetcore.dto.request.CreateInterventionRequest;
import ma.intersig.fleetcore.dto.response.InterventionDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.dto.response.TypeInterventionRefDto;
import ma.intersig.fleetcore.entity.Composant;
import ma.intersig.fleetcore.entity.Intervention;
import ma.intersig.fleetcore.entity.TypeIntervention;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.InterventionRepository;
import ma.intersig.fleetcore.repository.TypeInterventionRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@Transactional
public class InterventionService {

    private static final List<String> VALID_CATEGORIES = List.of(
            "preventive", "corrective", "depannage", "controle"
    );

    private final InterventionRepository interventionRepository;
    private final VehiculeRepository vehiculeRepository;
    private final TypeInterventionRepository typeInterventionRepository;
    private final EntityManager entityManager;

    public InterventionService(InterventionRepository interventionRepository,
                               VehiculeRepository vehiculeRepository,
                               TypeInterventionRepository typeInterventionRepository,
                               EntityManager entityManager) {
        this.interventionRepository = interventionRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.typeInterventionRepository = typeInterventionRepository;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<TypeInterventionRefDto> listTypes() {
        return typeInterventionRepository.findAll().stream()
                .map(TypeInterventionRefDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<InterventionDto> list(String q, Long vehiculeId, String categorie, String statut,
                                               OffsetDateTime dateFrom, OffsetDateTime dateTo,
                                               Pageable pageable) {
        Page<Intervention> page = (q != null || vehiculeId != null || categorie != null || statut != null
                || dateFrom != null || dateTo != null)
                ? interventionRepository.findByFilters(q, vehiculeId, categorie, statut, dateFrom, dateTo, pageable)
                : interventionRepository.findAllWithRelations(pageable);
        return PageResponse.of(page.map(InterventionDto::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<InterventionDto> listByVehicule(Long vehiculeId, String categorie,
                                                         String statut, Pageable pageable) {
        Page<Intervention> page = interventionRepository.findByFilters(null, vehiculeId, categorie, statut, null, null, pageable);
        return PageResponse.of(page.map(InterventionDto::from));
    }

    private void validateCategorie(String categorie) {
        if (categorie != null && !VALID_CATEGORIES.contains(categorie)) {
            throw new BusinessException("Invalid categorie: " + categorie, "INVALID_CATEGORIE", 422);
        }
    }

    /** Cost columns are NOT NULL in the DB; default to zero when the request omits them. */
    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    public InterventionDto create(CreateInterventionRequest req) {
        validateCategorie(req.categorie());
        Vehicule vehicule = vehiculeRepository.findById(req.vehiculeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));
        TypeIntervention type = typeInterventionRepository.findById(req.typeInterventionId())
                .orElseThrow(() -> new ResourceNotFoundException("Intervention type not found", "TYPE_NOT_FOUND"));

        Intervention intervention = new Intervention();
        intervention.setVehicule(vehicule);
        intervention.setTypeIntervention(type);
        intervention.setCategorie(req.categorie());
        intervention.setPartie(req.partie());
        intervention.setNBs(req.nBs());
        intervention.setDateDebut(req.dateDebut());
        intervention.setCoutPieces(nz(req.coutPieces()));
        intervention.setCoutMainOeuvre(nz(req.coutMainOeuvre()));
        intervention.setCoutSousTraitance(nz(req.coutSousTraitance()));
        intervention.setObservations(req.observations());
        intervention.setPhotoUrl(req.photoUrl());

        if (req.composantId() != null) {
            intervention.setComposant(entityManager.getReference(Composant.class, req.composantId()));
        }

        intervention = interventionRepository.save(intervention);
        entityManager.refresh(intervention);

        return InterventionDto.from(intervention);
    }

    public InterventionDto update(Long id, CreateInterventionRequest req) {
        validateCategorie(req.categorie());
        Intervention intervention = interventionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Intervention not found", "INTERVENTION_NOT_FOUND"));

        Vehicule vehicule = vehiculeRepository.findById(req.vehiculeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));
        TypeIntervention type = typeInterventionRepository.findById(req.typeInterventionId())
                .orElseThrow(() -> new ResourceNotFoundException("Intervention type not found", "TYPE_NOT_FOUND"));

        intervention.setVehicule(vehicule);
        intervention.setTypeIntervention(type);
        intervention.setCategorie(req.categorie());
        intervention.setPartie(req.partie());
        intervention.setNBs(req.nBs());
        intervention.setDateDebut(req.dateDebut());
        intervention.setCoutPieces(nz(req.coutPieces()));
        intervention.setCoutMainOeuvre(nz(req.coutMainOeuvre()));
        intervention.setCoutSousTraitance(nz(req.coutSousTraitance()));
        intervention.setObservations(req.observations());
        intervention.setPhotoUrl(req.photoUrl());

        if (req.composantId() != null) {
            intervention.setComposant(entityManager.getReference(Composant.class, req.composantId()));
        } else {
            intervention.setComposant(null);
        }

        intervention = interventionRepository.save(intervention);
        entityManager.refresh(intervention);

        return InterventionDto.from(intervention);
    }

    @Transactional(readOnly = true)
    public InterventionDto getById(Long id) {
        Intervention i = interventionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Intervention not found", "INTERVENTION_NOT_FOUND"));
        return InterventionDto.from(i);
    }

    public InterventionDto cloturer(Long id) {
        Intervention i = interventionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Intervention not found", "INTERVENTION_NOT_FOUND"));
        if (i.getDateFin() != null) {
            throw new BusinessException("Intervention already closed", "ALREADY_CLOSED", 422);
        }
        i.setDateFin(OffsetDateTime.now());
        i = interventionRepository.save(i);
        return InterventionDto.from(i);
    }

    @Transactional(readOnly = true)
    public PageResponse<InterventionDto> enCours(Pageable pageable) {
        Page<Intervention> page = interventionRepository.findByDateFinIsNull(pageable);
        return PageResponse.of(page.map(InterventionDto::from));
    }

    @Transactional(readOnly = true)
    public List<InterventionDto> recentes(int limit) {
        return interventionRepository.findAllByOrderByDateDebutDesc(
                org.springframework.data.domain.PageRequest.of(0, limit))
                .getContent().stream().map(InterventionDto::from).toList();
    }
}