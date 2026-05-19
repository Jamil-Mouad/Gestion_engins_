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
            "AND (:q IS NULL OR LOWER(c.designation) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "     OR LOWER(c.reference) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Composant> searchWithFilters(@Param("q") String q, @Param("categorie") String categorie, Pageable pageable);

    @Query("SELECT c FROM Composant c WHERE c.parent IS NULL AND c.actif = true ORDER BY c.designation")
    List<Composant> findByParentIsNull();

    List<Composant> findByCategorieAndActifTrue(String categorie);

    Optional<Composant> findByReference(String reference);

    boolean existsByParentId(Long parentId);
}