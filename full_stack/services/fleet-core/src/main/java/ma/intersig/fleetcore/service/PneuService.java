package ma.intersig.fleetcore.service;

import jakarta.persistence.EntityManager;
import ma.intersig.fleetcore.dto.request.CreateInspectionRequest;
import ma.intersig.fleetcore.dto.request.CreatePneuRequest;
import ma.intersig.fleetcore.dto.request.PermuterPneuRequest;
import ma.intersig.fleetcore.dto.request.RemplacerPneuRequest;
import ma.intersig.fleetcore.dto.request.RemonterPneuRequest;
import ma.intersig.fleetcore.dto.request.UpdatePneuRequest;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.dto.response.PneuDto;
import ma.intersig.fleetcore.dto.response.PneuInspectionDto;
import ma.intersig.fleetcore.entity.Camion;
import ma.intersig.fleetcore.entity.Pneu;
import ma.intersig.fleetcore.entity.PneuInspection;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.PneuInspectionRepository;
import ma.intersig.fleetcore.repository.PneuRepository;
import ma.intersig.fleetcore.repository.UserRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class PneuService {

    private final PneuRepository pneuRepository;
    private final PneuInspectionRepository pneuInspectionRepository;
    private final VehiculeRepository vehiculeRepository;
    private final UserRepository userRepository;

    @jakarta.persistence.PersistenceContext
    private EntityManager entityManager;

    public PneuService(PneuRepository pneuRepository,
                       PneuInspectionRepository pneuInspectionRepository,
                       VehiculeRepository vehiculeRepository,
                       UserRepository userRepository) {
        this.pneuRepository = pneuRepository;
        this.pneuInspectionRepository = pneuInspectionRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PneuDto getById(Long id) {
        Pneu pneu = pneuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pneu not found", "PNEU_NOT_FOUND"));
        return PneuDto.from(pneu);
    }

    @Transactional(readOnly = true)
    public List<PneuDto> listByVehicule(Long vehiculeId) {
        return pneuRepository.findByVehiculeIdAndActifTrue(vehiculeId).stream()
                .map(PneuDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PneuDto> listAvailable() {
        return pneuRepository.findAllAvailable().stream()
                .map(PneuDto::from)
                .toList();
    }

    public PneuDto remonter(Long pneuId, RemonterPneuRequest req) {
        Pneu pneu = pneuRepository.findById(pneuId)
                .orElseThrow(() -> new ResourceNotFoundException("Pneu not found", "PNEU_NOT_FOUND"));

        if (Boolean.TRUE.equals(pneu.getActif())) {
            throw new BusinessException("Pneu is already active", "PNEU_ALREADY_ACTIVE", 422);
        }

        Vehicule vehicule = vehiculeRepository.findById(req.vehiculeId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));

        pneuRepository.findByVehiculeIdAndPositionAndActifTrue(req.vehiculeId(), req.position())
                .ifPresent(existing -> {
                    throw new BusinessException(
                            "Position " + req.position() + " is already occupied", "POSITION_OCCUPIED", 422);
                });

        // Refuse to remount a tire that has exceeded its expected life
        Integer kmRestant = pneu.getKmRestant();
        if (kmRestant == null || kmRestant <= 0) {
            throw new BusinessException(
                "Pneu is exhausted (kmRestant=" + (kmRestant != null ? kmRestant : "null")
                    + ") and cannot be remounted", "PNEU_EXHAUSTED", 422);
        }

        pneu.setVehicule(vehicule);
        pneu.setPosition(req.position());
        pneu.setActif(true);
        pneu.setKmMontage(getVehiculeKm(vehicule));

        // Pre-set status; the DB trigger (update_pneu_status) will override on save
        if (kmRestant <= 5000) {
            pneu.setStatus("warn");
        } else {
            pneu.setStatus("ok");
        }

        pneu = pneuRepository.save(pneu);
        createInspection(pneu, null, "Remounted", null);

        entityManager.flush();
        entityManager.refresh(pneu);

        return PneuDto.from(pneu);
    }

    public PneuDto update(Long pneuId, UpdatePneuRequest req) {
        Pneu pneu = pneuRepository.findById(pneuId)
                .orElseThrow(() -> new ResourceNotFoundException("Pneu not found", "PNEU_NOT_FOUND"));

        if (req.nSerie() != null) {
            validateUniqueNSerie(req.nSerie(), pneuId);
            pneu.setNSerie(req.nSerie());
        }
        if (req.reference() != null)      pneu.setReference(req.reference());
        if (req.marque() != null)         pneu.setMarque(req.marque());
        if (req.dateMontage() != null)    pneu.setDateMontage(req.dateMontage());
        if (req.expectedLifeKm() != null) pneu.setExpectedLifeKm(req.expectedLifeKm());
        if (req.pressionPsi() != null)    pneu.setPressionPsi(req.pressionPsi());
        if (req.profondeur32e() != null)  pneu.setProfondeur32e(req.profondeur32e());
        if (req.photoUrl() != null)       pneu.setPhotoUrl(req.photoUrl());

        pneuRepository.save(pneu);
        // Re-read to pick up trigger-updated status and generated km_restant
        pneu = pneuRepository.findById(pneuId).orElseThrow();

        return PneuDto.from(pneu);
    }

    public PneuDto assign(Long vehiculeId, CreatePneuRequest req) {
        Vehicule vehicule = vehiculeRepository.findById(vehiculeId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));

        pneuRepository.findByVehiculeIdAndPositionAndActifTrue(vehiculeId, req.position())
                .ifPresent(existing -> {
                    throw new BusinessException("Position " + req.position() + " is already occupied", "POSITION_OCCUPIED", 422);
                });

        validateUniqueNSerie(req.nSerie(), null);

        Pneu pneu = new Pneu();
        pneu.setVehicule(vehicule);
        pneu.setPosition(req.position());
        pneu.setNSerie(req.nSerie());
        pneu.setReference(req.reference());
        pneu.setMarque(req.marque());
        pneu.setDateMontage(req.dateMontage());
        pneu.setExpectedLifeKm(req.expectedLifeKm());
        pneu.setPressionPsi(req.pressionPsi());
        pneu.setProfondeur32e(req.profondeur32e());
        pneu.setKmParcourus(0);
        pneu.setKmMontage(getVehiculeKm(vehicule));
        pneu.setStatus("ok");
        pneu.setActif(true);

        pneu = pneuRepository.save(pneu);

        createInspection(pneu, null, "Installed", null);

        pneu = pneuRepository.findById(pneu.getId()).orElseThrow();
        return PneuDto.from(pneu);
    }

    public Map<String, PneuDto> permuter(Long pneuId, PermuterPneuRequest req) {
        Pneu pneu1 = pneuRepository.findById(pneuId)
                .orElseThrow(() -> new ResourceNotFoundException("Pneu not found", "PNEU_NOT_FOUND"));

        Pneu pneu2 = pneuRepository.findByVehiculeIdAndPositionAndActifTrue(
                        pneu1.getVehicule().getId(), req.nouvellePosition())
                .orElseThrow(() -> new BusinessException(
                        "No active pneu at position " + req.nouvellePosition() + " on same vehicle",
                        "POSITION_EMPTY", 422));

        Short oldPosition = pneu1.getPosition();
        Short newPosition = pneu2.getPosition();

        // Temporarily deactivate pneu1 to sidestep the partial unique index
        // on (vehicule_id, position) WHERE actif = true during the two-step swap.
        pneu1.setActif(false);
        pneuRepository.save(pneu1);
        entityManager.flush();

        pneu2.setPosition(oldPosition);
        pneuRepository.save(pneu2);
        entityManager.flush();

        pneu1.setPosition(newPosition);
        pneu1.setActif(true);
        pneuRepository.save(pneu1);

        createInspection(pneu1, null, "Rotation", null);
        createInspection(pneu2, null, "Rotation", null);

        entityManager.flush();
        entityManager.refresh(pneu1);
        entityManager.refresh(pneu2);

        Map<String, PneuDto> result = new LinkedHashMap<>();
        result.put("pneu1", PneuDto.from(pneu1));
        result.put("pneu2", PneuDto.from(pneu2));
        return result;
    }

    public PneuDto remplacer(Long pneuId, RemplacerPneuRequest req) {
        Pneu oldPneu = pneuRepository.findById(pneuId)
                .orElseThrow(() -> new ResourceNotFoundException("Pneu not found", "PNEU_NOT_FOUND"));

        Vehicule vehicule = oldPneu.getVehicule();

        validateUniqueNSerie(req.nSerie(), null);

        oldPneu.setActif(false);
        pneuRepository.save(oldPneu);
        entityManager.flush(); // force UPDATE before INSERT of new pneu at same position

        createInspection(oldPneu, null, "Replaced", null);

        Pneu newPneu = new Pneu();
        newPneu.setVehicule(vehicule);
        newPneu.setPosition(oldPneu.getPosition());
        newPneu.setNSerie(req.nSerie());
        newPneu.setReference(req.reference());
        newPneu.setMarque(req.marque());
        newPneu.setDateMontage(req.dateMontage());
        newPneu.setExpectedLifeKm(req.expectedLifeKm());
        newPneu.setPressionPsi(req.pressionPsi());
        newPneu.setProfondeur32e(req.profondeur32e());
        newPneu.setKmParcourus(0);
        newPneu.setKmMontage(getVehiculeKm(vehicule));
        newPneu.setStatus("ok");
        newPneu.setActif(true);

        newPneu = pneuRepository.save(newPneu);

        createInspection(newPneu, null, "Installed", null);

        entityManager.flush();
        entityManager.refresh(newPneu);

        return PneuDto.from(newPneu);
    }

    @Transactional(readOnly = true)
    public List<PneuDto> alertes() {
        List<Pneu> pneus = pneuRepository.findByStatusIn(
                List.of("warn", "empty"),
                Sort.by(Sort.Order.desc("status"), Sort.Order.asc("kmRestant"))
        );
        return pneus.stream().map(PneuDto::from).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<PneuInspectionDto> listInspections(Long pneuId, Pageable pageable) {
        return PageResponse.of(pneuInspectionRepository.findByPneuIdOrderByDateInspectionDesc(pneuId, pageable)
                .map(PneuInspectionDto::from));
    }

    @Transactional(readOnly = true)
    public List<PneuInspectionDto> listActivityLog(Long pneuId) {
        return pneuInspectionRepository.findByPneuIdOrderByDateInspectionDesc(pneuId, Pageable.unpaged())
                .getContent().stream()
                .map(PneuInspectionDto::from)
                .toList();
    }

    public PneuDto logInspection(Long pneuId, Long userId, CreateInspectionRequest req) {
        Pneu pneu = pneuRepository.findById(pneuId)
                .orElseThrow(() -> new ResourceNotFoundException("Pneu not found", "PNEU_NOT_FOUND"));

        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        PneuInspection inspection = new PneuInspection();
        inspection.setPneu(pneu);
        inspection.setDateInspection(OffsetDateTime.now());
        inspection.setActivity(req.activity());
        inspection.setPressionPsi(req.pressionPsi());
        inspection.setProfondeur32e(req.profondeur32e());
        inspection.setNotes(req.notes());
        inspection.setUser(user);
        pneuInspectionRepository.save(inspection);

        if (req.pressionPsi() != null) {
            pneu.setPressionPsi(req.pressionPsi());
        }
        if (req.profondeur32e() != null) {
            pneu.setProfondeur32e(req.profondeur32e());
        }
        pneuRepository.save(pneu);

        entityManager.flush();
        entityManager.refresh(pneu);

        return PneuDto.from(pneu);
    }

    public void softDelete(Long pneuId) {
        Pneu pneu = pneuRepository.findById(pneuId)
                .orElseThrow(() -> new ResourceNotFoundException("Pneu not found", "PNEU_NOT_FOUND"));
        pneu.setActif(false);
        pneuRepository.save(pneu);
    }

    private void validateUniqueNSerie(String nSerie, Long excludeId) {
        if (nSerie == null || nSerie.isBlank()) {
            return;
        }
        if (pneuRepository.existsByNSerieAndIdNot(nSerie, excludeId != null ? excludeId : -1L)) {
            throw new BusinessException(
                    "A tire with serial number '" + nSerie + "' already exists",
                    "N_SERIE_ALREADY_EXISTS", 409);
        }
    }

    private Integer getVehiculeKm(Vehicule vehicule) {
        if (vehicule instanceof Camion camion) {
            return camion.getCompteurKm();
        }
        return 0;
    }

    private void createInspection(Pneu pneu, Long userId, String activity, String notes) {
        PneuInspection inspection = new PneuInspection();
        inspection.setPneu(pneu);
        inspection.setDateInspection(OffsetDateTime.now());
        inspection.setActivity(activity);
        inspection.setNotes(notes);
        if (userId != null) {
            userRepository.findById(userId).ifPresent(inspection::setUser);
        }
        pneuInspectionRepository.save(inspection);
    }
}