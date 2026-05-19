package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.Vehicule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehiculeRepository extends JpaRepository<Vehicule, Long> {

    Page<Vehicule> findByActifTrue(Pageable pageable);

    @Query("SELECT v FROM Vehicule v WHERE v.actif = true AND (" +
            "LOWER(v.code) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(v.marque) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(v.modele) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Vehicule> search(@Param("q") String q, Pageable pageable);

    @Query("SELECT v FROM Vehicule v WHERE v.actif = true " +
            "AND (:type IS NULL OR v.type = :type) " +
            "AND (:statut IS NULL OR v.statut = :statut) " +
            "AND (:q IS NULL OR LOWER(v.code) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "     OR LOWER(v.marque) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "     OR LOWER(v.modele) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Vehicule> searchWithFilters(@Param("q") String q, @Param("type") String type,
                                     @Param("statut") String statut, Pageable pageable);

    @Query("SELECT v FROM Vehicule v WHERE v.actif = true AND v.type = :type")
    Page<Vehicule> findByTypeAndActifTrue(@Param("type") String type, Pageable pageable);

    @Query("SELECT v FROM Vehicule v WHERE v.actif = true AND v.statut = :statut")
    Page<Vehicule> findByStatutAndActifTrue(@Param("statut") String statut, Pageable pageable);

    @Query("SELECT v FROM Vehicule v WHERE v.actif = true AND v.type = :type AND v.statut = :statut")
    Page<Vehicule> findByTypeAndStatutAndActifTrue(@Param("type") String type, @Param("statut") String statut, Pageable pageable);

    Optional<Vehicule> findByCodeAndIdNot(String code, Long id);

    Optional<Vehicule> findByMatriculeAndIdNot(String matricule, Long id);

    @Query("SELECT v FROM Vehicule v WHERE v.nChassis = :nChassis AND v.id <> :id")
    Optional<Vehicule> findByNChassisAndIdNot(@Param("nChassis") String nChassis, @Param("id") Long id);

    List<Vehicule> findByCode(String code);

    @Query("SELECT v FROM Vehicule v WHERE v.actif = true")
    List<Vehicule> findAllActive();
}