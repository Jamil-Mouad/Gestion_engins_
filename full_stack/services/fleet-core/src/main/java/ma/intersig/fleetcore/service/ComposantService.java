package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.request.CreateComposantRequest;
import ma.intersig.fleetcore.dto.response.ComposantDto;
import ma.intersig.fleetcore.entity.Composant;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.ComposantRepository;
import ma.intersig.fleetcore.repository.InterventionRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final InterventionRepository interventionRepository;

    public ComposantService(ComposantRepository composantRepository,
                            InterventionRepository interventionRepository) {
        this.composantRepository = composantRepository;
        this.interventionRepository = interventionRepository;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "composants-tree", key = "#type == null ? 'ALL' : #type")
    public List<ComposantDto> getTree(String type) {
        List<Composant> roots = (type == null || type.isBlank())
                ? composantRepository.findByParentIsNull()
                : composantRepository.findRootsByType(type);
        Map<Long, ComposantDto> dtoMap = new LinkedHashMap<>();
        for (Composant root : roots) {
            ComposantDto rootDto = ComposantDto.from(root);
            dtoMap.put(root.getId(), rootDto);
            buildChildren(root, rootDto, dtoMap, type);
        }
        return roots.stream().map(r -> dtoMap.get(r.getId())).toList();
    }

    /** A node is visible when no type filter is applied, or when it is shared (NULL) or matches the type. */
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
    public List<ComposantDto> search(String q, String categorie) {
        String qNorm = (q != null && !q.isBlank()) ? q : null;
        String catNorm = (categorie != null && !categorie.isBlank()) ? categorie : null;
        return composantRepository.searchWithFilters(
                qNorm, catNorm, PageRequest.of(0, 20, Sort.by("designation")))
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

    @CacheEvict(value = "composants-tree", allEntries = true)
    public void delete(Long id) {
        Composant c = composantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Composant not found", "COMPOSANT_NOT_FOUND"));
        boolean hasChildren = composantRepository.existsByParentId(id);
        boolean referencedByIntervention = interventionRepository.existsByComposantId(id);
        if (hasChildren || referencedByIntervention) {
            throw new BusinessException("Composant is in use and cannot be deleted", "COMPOSANT_IN_USE", 409);
        }
        composantRepository.delete(c);
    }

    private void mapRequestToEntity(CreateComposantRequest req, Composant c) {
        if (req.parentId() != null) {
            Composant parent = composantRepository.findById(req.parentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Parent composant not found", "PARENT_COMPOSANT_NOT_FOUND"));
            c.setParent(parent);
        } else {
            c.setParent(null);
        }
        c.setNiveau(req.niveau() != null ? req.niveau() : (short) 1);
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