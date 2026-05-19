package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.DemandeAchat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DemandeAchatRepository extends JpaRepository<DemandeAchat, Long> {

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(code, 9) AS integer)), 0) + 1 FROM demandes_achat WHERE code LIKE CONCAT('DA-', CAST(:year AS text), '-%') AND SUBSTRING(code, 9) ~ '^[0-9]+$'", nativeQuery = true)
    Integer nextCode(@Param("year") int year);

    Page<DemandeAchat> findByStatut(String statut, Pageable pageable);

    @Query("SELECT d FROM DemandeAchat d WHERE (:statut IS NULL OR d.statut = :statut) AND (:urgence IS NULL OR d.urgence = :urgence) AND (:q IS NULL OR LOWER(d.motif) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<DemandeAchat> findByFilters(@Param("statut") String statut, @Param("urgence") String urgence, @Param("q") String q, Pageable pageable);
}