package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.Composant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComposantRepository extends JpaRepository<Composant, Long> {

    @Query("SELECT c FROM Composant c WHERE c.actif = true AND (" +
            "LOWER(c.designation) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(c.reference) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Composant> search(@Param("q") String q, Pageable pageable);

    @Query("SELECT c FROM Composant c WHERE c.actif = true " +
            "AND (:categorie IS NULL OR c.categorie = :categorie) " +
            "AND (:vehiculeId IS NULL OR c.vehicule.id = :vehiculeId) " +
            "AND (:q IS NULL OR LOWER(c.designation) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
            "     OR LOWER(c.reference) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))")
    Page<Composant> searchWithFilters(@Param("q") String q, @Param("categorie") String categorie,
                                      @Param("vehiculeId") Long vehiculeId, Pageable pageable);

    // Template view: roots of the per-type starter tree (vehicule IS NULL)
    @Query("SELECT c FROM Composant c WHERE c.parent IS NULL AND c.vehicule IS NULL AND c.actif = true ORDER BY c.designation")
    List<Composant> findByParentIsNull();

    // Template roots visible for a given vehicle type: shared (NULL) baseline + type-specific roots.
    @Query("SELECT c FROM Composant c WHERE c.parent IS NULL AND c.vehicule IS NULL AND c.actif = true " +
            "AND (c.vehiculeType IS NULL OR c.vehiculeType = :type) ORDER BY c.designation")
    List<Composant> findRootsByType(@Param("type") String type);

    // A vehicle's own composant tree roots.
    @Query("SELECT c FROM Composant c WHERE c.parent IS NULL AND c.actif = true " +
            "AND c.vehicule.id = :vehiculeId ORDER BY c.designation")
    List<Composant> findRootsByVehiculeId(@Param("vehiculeId") Long vehiculeId);

    // All template nodes (any level) visible for a type — used to copy the
    // starter tree onto a newly created vehicle.
    @Query("SELECT c FROM Composant c WHERE c.vehicule IS NULL AND c.actif = true " +
            "AND (c.vehiculeType IS NULL OR c.vehiculeType = :type) ORDER BY c.niveau, c.id")
    List<Composant> findTemplateNodesByType(@Param("type") String type);

    List<Composant> findByCategorieAndActifTrue(String categorie);

    Optional<Composant> findByReference(String reference);

    boolean existsByParentId(Long parentId);

    // The composant and all its descendants, for cascade delete.
    @Query(value = "WITH RECURSIVE subtree AS (" +
            "SELECT id FROM composants WHERE id = :id " +
            "UNION ALL SELECT c.id FROM composants c JOIN subtree s ON c.parent_id = s.id) " +
            "SELECT id FROM subtree", nativeQuery = true)
    List<Long> findSubtreeIds(@Param("id") Long id);

    // True when any of the composants is referenced by business data
    // (interventions, pneus, vidanges, demandes d'achat) — such a subtree
    // must not be cascade-deleted.
    @Query(value = "SELECT EXISTS(SELECT 1 FROM interventions  WHERE composant_id IN (:ids)) " +
            "OR EXISTS(SELECT 1 FROM pneus          WHERE composant_id IN (:ids)) " +
            "OR EXISTS(SELECT 1 FROM suivi_vidanges WHERE composant_id IN (:ids)) " +
            "OR EXISTS(SELECT 1 FROM demandes_achat WHERE composant_id IN (:ids))", nativeQuery = true)
    boolean isAnyReferencedByBusinessData(@Param("ids") List<Long> ids);

    @Query("SELECT COUNT(c) > 0 FROM Composant c WHERE c.vehicule.id = :vehiculeId " +
            "AND c.reference = :reference AND c.id <> :id")
    boolean existsByVehiculeIdAndReferenceAndIdNot(@Param("vehiculeId") Long vehiculeId,
                                                   @Param("reference") String reference,
                                                   @Param("id") Long id);
}