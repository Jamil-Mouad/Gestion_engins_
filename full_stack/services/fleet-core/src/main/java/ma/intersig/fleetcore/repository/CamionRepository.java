package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.Camion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CamionRepository extends JpaRepository<Camion, Long> {

    @Query("SELECT c FROM Camion c WHERE c.actif = true AND (" +
            "c.visiteTechTracteurExpiration < :date OR " +
            "c.visiteTechSemiExpiration < :date OR " +
            "c.carnetCirculationExpiration < :date OR " +
            "c.metrologieExpiration < :date OR " +
            "c.extincteurExpiration < :date)")
    List<Camion> findExpiringBefore(@Param("date") LocalDate date);
}