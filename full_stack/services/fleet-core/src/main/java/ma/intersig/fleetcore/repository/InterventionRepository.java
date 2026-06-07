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

    @Query(value = "SELECT i FROM Intervention i " +
           "LEFT JOIN FETCH i.vehicule v " +
           "LEFT JOIN FETCH i.typeIntervention t " +
           "LEFT JOIN FETCH i.composant c " +
           "WHERE (:vehiculeId IS NULL OR v.id = :vehiculeId) " +
           "AND (:categorie IS NULL OR i.categorie = :categorie) " +
           "AND (:statut IS NULL OR (:statut = 'open' AND i.dateFin IS NULL) OR (:statut = 'closed' AND i.dateFin IS NOT NULL)) " +
           "AND (CAST(:dateFrom AS java.time.OffsetDateTime) IS NULL OR i.dateDebut >= :dateFrom) " +
           "AND (CAST(:dateTo AS java.time.OffsetDateTime) IS NULL OR i.dateDebut <= :dateTo) " +
           "AND (CAST(:q AS string) IS NULL OR LOWER(v.code) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
           "  OR LOWER(COALESCE(i.nBs, '')) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
           "  OR LOWER(COALESCE(c.designation, '')) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))",
           countQuery = "SELECT COUNT(i) FROM Intervention i " +
           "LEFT JOIN i.vehicule v " +
           "LEFT JOIN i.typeIntervention t " +
           "LEFT JOIN i.composant c " +
           "WHERE (:vehiculeId IS NULL OR v.id = :vehiculeId) " +
           "AND (:categorie IS NULL OR i.categorie = :categorie) " +
           "AND (:statut IS NULL OR (:statut = 'open' AND i.dateFin IS NULL) OR (:statut = 'closed' AND i.dateFin IS NOT NULL)) " +
           "AND (CAST(:dateFrom AS java.time.OffsetDateTime) IS NULL OR i.dateDebut >= :dateFrom) " +
           "AND (CAST(:dateTo AS java.time.OffsetDateTime) IS NULL OR i.dateDebut <= :dateTo) " +
           "AND (CAST(:q AS string) IS NULL OR LOWER(v.code) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
           "  OR LOWER(COALESCE(i.nBs, '')) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')) " +
           "  OR LOWER(COALESCE(c.designation, '')) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))")
    Page<Intervention> findByFilters(@Param("q") String q,
                                     @Param("vehiculeId") Long vehiculeId,
                                     @Param("categorie") String categorie,
                                     @Param("statut") String statut,
                                     @Param("dateFrom") OffsetDateTime dateFrom,
                                     @Param("dateTo") OffsetDateTime dateTo,
                                     Pageable pageable);

    Page<Intervention> findAllByOrderByDateDebutDesc(Pageable pageable);

    boolean existsByComposantId(Long composantId);

    @Query("SELECT i FROM Intervention i LEFT JOIN FETCH i.vehicule")
    List<Intervention> findAllWithVehicule();

    @Query(value = "SELECT i FROM Intervention i LEFT JOIN FETCH i.vehicule LEFT JOIN FETCH i.typeIntervention LEFT JOIN FETCH i.composant",
           countQuery = "SELECT COUNT(i) FROM Intervention i")
    Page<Intervention> findAllWithRelations(Pageable pageable);

    @Query("SELECT i FROM Intervention i LEFT JOIN FETCH i.vehicule LEFT JOIN FETCH i.typeIntervention LEFT JOIN FETCH i.composant WHERE i.dateDebut >= :from AND i.dateDebut <= :to")
    List<Intervention> findAllWithVehiculeInRange(@Param("from") java.time.OffsetDateTime from,
                                                  @Param("to") java.time.OffsetDateTime to);

    @Query("SELECT i FROM Intervention i LEFT JOIN FETCH i.vehicule LEFT JOIN FETCH i.typeIntervention LEFT JOIN FETCH i.composant WHERE i.vehicule.id = :vehiculeId")
    List<Intervention> findAllWithVehiculeByVehiculeId(@Param("vehiculeId") Long vehiculeId);
}