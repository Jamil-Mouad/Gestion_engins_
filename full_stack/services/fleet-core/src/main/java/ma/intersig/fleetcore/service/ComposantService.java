package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.request.CreateComposantRequest;
import ma.intersig.fleetcore.dto.response.ComposantDto;
import ma.intersig.fleetcore.entity.Composant;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.ComposantRepository;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class ComposantService {

    private static final List<String> CATEGORIES = List.of(
            "moteur", "pneumatique", "freinage", "hydraulique", "electrique", "transmission", "autre"
    );

    private final ComposantRepository composantRepository;
    private final VehiculeRepository vehiculeRepository;

    public ComposantService(ComposantRepository composantRepository,
                            VehiculeRepository vehiculeRepository) {
        this.composantRepository = composantRepository;
        this.vehiculeRepository = vehiculeRepository;
    }

    /**
     * Tree lookup: with a vehiculeId, returns that vehicle's own composant
     * tree; otherwise the template tree (optionally scoped to a type).
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "composants-tree",
               key = "#vehiculeId != null ? 'V' + #vehiculeId : (#type == null ? 'ALL' : #type)")
    public List<ComposantDto> getTree(Long vehiculeId, String type) {
        List<Composant> roots;
        if (vehiculeId != null) {
            roots = composantRepository.findRootsByVehiculeId(vehiculeId);
        } else if (type == null || type.isBlank()) {
            roots = composantRepository.findByParentIsNull();
        } else {
            roots = composantRepository.findRootsByType(type);
        }
        String typeFilter = vehiculeId != null ? null : type;
        Map<Long, ComposantDto> dtoMap = new LinkedHashMap<>();
        for (Composant root : roots) {
            ComposantDto rootDto = ComposantDto.from(root);
            dtoMap.put(root.getId(), rootDto);
            buildChildren(root, rootDto, dtoMap, typeFilter);
        }
        return roots.stream().map(r -> dtoMap.get(r.getId())).toList();
    }

    private boolean matchesType(Composant c, String type) {
        if (type == null || type.isBlank()) return true;
        return c.getVehiculeType() == null || type.equals(c.getVehiculeType());
    }

    private void buildChildren(Composant parent, ComposantDto parentDto, Map<Long, ComposantDto> dtoMap, String type) {
        List<Composant> children = parent.getChildren();
        if (children == null) return;
        for (Composant child : children) {
            if (Boolean.FALSE.equals(child.getActif()) || !matchesType(child, type)) continue;
            ComposantDto childDto = ComposantDto.from(child);
            parentDto.children().add(childDto);
            dtoMap.put(child.getId(), childDto);
            buildChildren(child, childDto, dtoMap, type);
        }
    }

    @Transactional(readOnly = true)
    public List<ComposantDto> search(String q, String categorie, Long vehiculeId) {
        String qNorm = (q != null && !q.isBlank()) ? q : null;
        String catNorm = (categorie != null && !categorie.isBlank()) ? categorie : null;
        return composantRepository.searchWithFilters(
                qNorm, catNorm, vehiculeId, PageRequest.of(0, 20, Sort.by("designation")))
                .getContent().stream().map(ComposantDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<String> getCategories() {
        return CATEGORIES;
    }

    @Transactional(readOnly = true)
    public ComposantDto getById(Long id) {
        Composant c = composantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Composant not found", "COMPOSANT_NOT_FOUND"));
        return ComposantDto.from(c);
    }

    @CacheEvict(value = "composants-tree", allEntries = true)
    public ComposantDto create(CreateComposantRequest req) {
        Composant c = new Composant();
        mapRequestToEntity(req, c);
        c = composantRepository.save(c);
        return ComposantDto.from(c);
    }

    @CacheEvict(value = "composants-tree", allEntries = true)
    public ComposantDto update(Long id, CreateComposantRequest req) {
        Composant c = composantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Composant not found", "COMPOSANT_NOT_FOUND"));
        mapRequestToEntity(req, c);
        c = composantRepository.save(c);
        return ComposantDto.from(c);
    }

    /** Cascade delete: removes the composant and its whole subtree, unless
     *  any node in it is referenced by business data (interventions, pneus,
     *  vidanges, demandes d'achat). */
    @CacheEvict(value = "composants-tree", allEntries = true)
    public void delete(Long id) {
        composantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Composant not found", "COMPOSANT_NOT_FOUND"));
        List<Long> subtreeIds = composantRepository.findSubtreeIds(id);
        if (composantRepository.isAnyReferencedByBusinessData(subtreeIds)) {
            throw new BusinessException("Composant is in use and cannot be deleted", "COMPOSANT_IN_USE", 409);
        }
        composantRepository.deleteAllByIdInBatch(subtreeIds);
    }

    /**
     * Copy the per-type starter template tree onto a freshly created vehicle.
     * Called from VehiculeService.create(); the copy preserves hierarchy,
     * references (unique per vehicle), images and stock values.
     */
    @CacheEvict(value = "composants-tree", allEntries = true)
    public void copyTemplateToVehicle(Vehicule vehicule) {
        List<Composant> templateNodes = composantRepository.findTemplateNodesByType(vehicule.getType());
        Map<Long, Composant> oldToNew = new HashMap<>();
        for (Composant t : templateNodes) {
            Composant parentCopy = null;
            if (t.getParent() != null) {
                parentCopy = oldToNew.get(t.getParent().getId());
                if (parentCopy == null) {
                    continue; // parent not visible for this type → skip node
                }
            }
            Composant copy = new Composant();
            copy.setParent(parentCopy);
            copy.setVehicule(vehicule);
            copy.setNiveau(t.getNiveau());
            copy.setReference(t.getReference());
            copy.setDesignation(t.getDesignation());
            copy.setCategorie(t.getCategorie());
            copy.setUnite(t.getUnite());
            copy.setMarque(t.getMarque());
            copy.setPrixUnitaire(t.getPrixUnitaire());
            copy.setStock(t.getStock());
            copy.setImageUrl(t.getImageUrl());
            copy.setVehiculeType(t.getVehiculeType());
            copy.setActif(true);
            oldToNew.put(t.getId(), composantRepository.save(copy));
        }
    }

    private void mapRequestToEntity(CreateComposantRequest req, Composant c) {
        if (req.parentId() != null) {
            Composant parent = composantRepository.findById(req.parentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Parent composant not found", "PARENT_COMPOSANT_NOT_FOUND"));
            c.setParent(parent);
            // the tree depth is unlimited — niveau is derived, never client-set
            c.setNiveau((short) (parent.getNiveau() + 1));
            // a child always belongs to the same tree (vehicle or template) as its parent
            c.setVehicule(parent.getVehicule());
        } else {
            c.setParent(null);
            c.setNiveau((short) 1);
            if (req.vehiculeId() != null) {
                Vehicule vehicule = vehiculeRepository.findById(req.vehiculeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found", "VEHICLE_NOT_FOUND"));
                c.setVehicule(vehicule);
            } else {
                c.setVehicule(null);
            }
        }
        if (c.getVehicule() != null && req.reference() != null && !req.reference().isBlank()
                && composantRepository.existsByVehiculeIdAndReferenceAndIdNot(
                        c.getVehicule().getId(), req.reference(), c.getId() != null ? c.getId() : -1L)) {
            throw new BusinessException(
                    "A composant with this reference already exists for this vehicle",
                    "REFERENCE_ALREADY_EXISTS", 409);
        }
        c.setDesignation(req.designation());
        c.setReference(req.reference());
        c.setCategorie(req.categorie());
        c.setUnite(req.unite());
        c.setMarque(req.marque());
        c.setPrixUnitaire(req.prixUnitaire());
        c.setStock(req.stock() != null ? req.stock() : 0);
        c.setImageUrl(req.imageUrl());
        c.setVehiculeType(req.vehiculeType());
    }
}
