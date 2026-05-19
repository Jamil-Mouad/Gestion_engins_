package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.Intervention;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface InterventionRepository extends JpaRepository<Intervention, Long> {

    Page<Intervention> findByVehiculeId(Long vehiculeId, Pageable pageable);

    Page<Intervention> findByCategorie(String categorie, Pageable pageable);

    @Query("SELECT i FROM Intervention i WHERE i.dateFin IS NULL")
    Page<Intervention> findByDateFinIsNull(Pageable pageable);

    @Query("SELECT i FROM Intervention i WHERE i.dateFin IS NOT NULL")
    Page<Intervention> findByDateFinIsNotNull(Pageable pageable);

    @Query("SELECT i FROM Intervention i WHERE (:vehiculeId IS NULL OR i.vehicule.id = :vehiculeId) AND (:categorie IS NULL OR i.categorie = :categorie) AND (:statut IS NULL OR (:statut = 'open' AND i.dateFin IS NULL) OR (:statut = 'closed' AND i.dateFin IS NOT NULL)) AND (CAST(:dateFrom AS java.time.OffsetDateTime) IS NULL OR i.dateDebut >= :dateFrom) AND (CAST(:dateTo AS java.time.OffsetDateTime) IS NULL OR i.dateDebut <= :dateTo)")
    Page<Intervention> findByFilters(@Param("vehiculeId") Long vehiculeId,
                                     @Param("categorie") String categorie,
                                     @Param("statut") String statut,
                                     @Param("dateFrom") OffsetDateTime dateFrom,
                                     @Param("dateTo") OffsetDateTime dateTo,
                                     Pageable pageable);

    Page<Intervention> findAllByOrderByDateDebutDesc(Pageable pageable);

    boolean existsByComposantId(Long composantId);

    @Query("SELECT i FROM Intervention i LEFT JOIN FETCH i.vehicule")
    List<Intervention> findAllWithVehicule();

    @Query("SELECT i FROM Intervention i LEFT JOIN FETCH i.vehicule WHERE i.dateDebut >= :from AND i.dateDebut <= :to")
    List<Intervention> findAllWithVehiculeInRange(@Param("from") java.time.OffsetDateTime from,
                                                  @Param("to") java.time.OffsetDateTime to);
}