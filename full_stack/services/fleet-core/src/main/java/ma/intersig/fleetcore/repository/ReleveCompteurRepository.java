package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.ReleveCompteur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReleveCompteurRepository extends JpaRepository<ReleveCompteur, Long> {

    @Query("SELECT r FROM ReleveCompteur r LEFT JOIN FETCH r.vehicule")
    List<ReleveCompteur> findAllWithVehicule();

    @Query("SELECT r FROM ReleveCompteur r LEFT JOIN FETCH r.vehicule WHERE r.dateReleve >= :from AND r.dateReleve <= :to")
    List<ReleveCompteur> findAllWithVehiculeBetweenDates(@Param("from") java.time.OffsetDateTime from,
                                                         @Param("to") java.time.OffsetDateTime to);

    List<ReleveCompteur> findByVehiculeIdOrderByDateReleveDesc(Long vehiculeId);
}