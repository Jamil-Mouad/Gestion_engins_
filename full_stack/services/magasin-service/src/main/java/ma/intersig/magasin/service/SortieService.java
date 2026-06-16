package ma.intersig.magasin.service;

import ma.intersig.magasin.dto.request.SortieRequest;
import ma.intersig.magasin.dto.response.LastTotaliseurDto;
import ma.intersig.magasin.dto.response.SortieDto;
import ma.intersig.magasin.dto.response.VehiculeSuggestDto;
import ma.intersig.magasin.entity.Citerne;
import ma.intersig.magasin.entity.SortieCarburant;
import ma.intersig.magasin.entity.VehiculeRef;
import ma.intersig.magasin.exception.BusinessException;
import ma.intersig.magasin.exception.ResourceNotFoundException;
import ma.intersig.magasin.client.FleetCoreClient;
import ma.intersig.magasin.repository.SortieCarburantRepository;
import ma.intersig.magasin.repository.VehiculeRefRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class SortieService {

    private final SortieCarburantRepository sortieRepository;
    private final VehiculeRefRepository vehiculeRepository;
    private final CiterneService citerneService;
    private final VehiculeLookup vehiculeLookup;
    private final FleetCoreClient fleetCoreClient;

    public SortieService(SortieCarburantRepository sortieRepository,
                         VehiculeRefRepository vehiculeRepository,
                         CiterneService citerneService,
                         VehiculeLookup vehiculeLookup,
                         FleetCoreClient fleetCoreClient) {
        this.sortieRepository = sortieRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.citerneService = citerneService;
        this.vehiculeLookup = vehiculeLookup;
        this.fleetCoreClient = fleetCoreClient;
    }

    @Transactional(readOnly = true)
    public Page<SortieDto> list(LocalDate dateMin, LocalDate dateMax, String vehiculeCode,
                                String search, Pageable pageable) {
        Citerne citerne = citerneService.getActive();
        String searchPattern = (search == null || search.isBlank())
                ? null : "%" + search.trim().toLowerCase() + "%";
        String normalizedCode = (vehiculeCode == null || vehiculeCode.isBlank()) ? null : vehiculeCode.trim();
        return sortieRepository.search(citerne.getId(), dateMin, dateMax, normalizedCode, searchPattern, pageable)
                .map(this::toDto);
    }

    @Transactional
    public SortieDto create(SortieRequest req, Long userId) {
        Citerne citerne = citerneService.getActive();
        SortieCarburant s = new SortieCarburant();
        s.setCiterneId(citerne.getId());
        s.setCreatedBy(userId);
        apply(s, req);
        SortieCarburant saved = sortieRepository.save(s);
        pushReleveAfterCommit(saved, req);
        return toDto(saved);
    }

    /**
     * After the sortie commits, push its odometer reading to fleet-core so the vehicle's tyre km
     * advances and any threshold alert fires. Done after commit (and best-effort) so a fleet-core
     * outage or a regressing counter never rolls back / blocks the sortie itself.
     */
    private void pushReleveAfterCommit(SortieCarburant s, SortieRequest req) {
        if (s.getVehiculeId() == null || req.compteur() == null) return;
        final Long vehiculeId = s.getVehiculeId();
        final Integer compteurKm = req.compteur().intValue();
        final OffsetDateTime dateReleve = s.getDateSortie().atStartOfDay().atOffset(ZoneOffset.UTC);
        final String authUserId = currentHeader("X-Authenticated-User-Id");
        final String authRoles = currentHeader("X-Authenticated-User-Roles");

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    fleetCoreClient.recordReleve(vehiculeId, compteurKm, dateReleve, authUserId, authRoles);
                }
            });
        } else {
            fleetCoreClient.recordReleve(vehiculeId, compteurKm, dateReleve, authUserId, authRoles);
        }
    }

    private String currentHeader(String name) {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest().getHeader(name);
        }
        return null;
    }

    @Transactional
    public SortieDto update(Long id, SortieRequest req) {
        SortieCarburant s = sortieRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sortie introuvable: " + id, "SORTIE_NOT_FOUND"));
        apply(s, req);
        return toDto(sortieRepository.save(s));
    }

    @Transactional
    public void delete(Long id) {
        if (!sortieRepository.existsById(id)) {
            throw new ResourceNotFoundException("Sortie introuvable: " + id, "SORTIE_NOT_FOUND");
        }
        sortieRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public LastTotaliseurDto lastTotaliseur() {
        Citerne citerne = citerneService.getActive();
        return sortieRepository.findFirstByCiterneIdOrderByDateSortieDescIdDesc(citerne.getId())
                .map(s -> new LastTotaliseurDto(s.getTotaliseur(), s.getDateSortie()))
                .orElse(new LastTotaliseurDto(null, null));
    }

    @Transactional(readOnly = true)
    public List<VehiculeSuggestDto> suggestVehicules(String q) {
        if (q == null || q.isBlank()) return List.of();
        return vehiculeRepository.suggest(q.trim(), PageRequest.of(0, 10)).stream()
                .map(v -> new VehiculeSuggestDto(v.getId(), v.getCode(), v.getType(), v.getMarque(),
                        v.getModele(), v.getMatricule()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> suggestDestinations(String q) {
        if (q == null || q.isBlank()) return List.of();
        return sortieRepository.suggestDestinations(q.trim(), PageRequest.of(0, 10));
    }

    private void apply(SortieCarburant s, SortieRequest req) {
        s.setDateSortie(req.dateSortie());
        s.setTotaliseur(req.totaliseur());
        s.setQuantiteLitres(req.quantiteLitres());
        s.setTypeMouvement(req.typeMouvement() == null ? "SORTIE" : req.typeMouvement());
        s.setDestination(req.destination().trim());
        s.setDemandeur(req.demandeur());
        s.setNumeroBs(req.numeroBs());
        s.setCompteur(req.compteur());
        s.setTiers(Boolean.TRUE.equals(req.tiers()));

        if (req.vehiculeId() != null) {
            VehiculeRef v = vehiculeRepository.findById(req.vehiculeId())
                    .orElseThrow(() -> new BusinessException(
                            "Véhicule introuvable: " + req.vehiculeId(), "VEHICULE_NOT_FOUND", 400));
            s.setVehiculeId(v.getId());
            s.setVehiculeCode(v.getCode());
        } else if (req.vehiculeCode() != null && !req.vehiculeCode().isBlank()) {
            s.setVehiculeCode(req.vehiculeCode().trim());
            s.setVehiculeId(vehiculeLookup.resolveByCode(req.vehiculeCode()).map(VehiculeRef::getId).orElse(null));
        } else {
            s.setVehiculeId(null);
            s.setVehiculeCode(null);
        }
    }

    private SortieDto toDto(SortieCarburant s) {
        return new SortieDto(s.getId(), s.getDateSortie(), s.getTotaliseur(), s.getQuantiteLitres(),
                s.getTypeMouvement(), s.getDestination(), s.getVehiculeId(), s.getVehiculeCode(),
                s.getTiers(), s.getCompteur(), s.getDemandeur(), s.getNumeroBs(), s.getSource());
    }
}
