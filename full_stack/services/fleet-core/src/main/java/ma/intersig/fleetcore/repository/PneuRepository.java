package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.Pneu;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PneuRepository extends JpaRepository<Pneu, Long> {

    List<Pneu> findByVehiculeIdAndActifTrue(Long vehiculeId, Sort sort);

    default List<Pneu> findByVehiculeIdAndActifTrue(Long vehiculeId) {
        return findByVehiculeIdAndActifTrue(vehiculeId, Sort.by("position"));
    }

    List<Pneu> findByStatusIn(List<String> statuses, Sort sort);

    Optional<Pneu> findByVehiculeIdAndPositionAndActifTrue(Long vehiculeId, Short position);

    @Query("SELECT p FROM Pneu p LEFT JOIN FETCH p.vehicule")
    List<Pneu> findAllWithVehicule();

    @Query("SELECT p FROM Pneu p LEFT JOIN FETCH p.vehicule WHERE p.actif = false ORDER BY p.id")
    List<Pneu> findAllAvailable();

    @Query("SELECT p FROM Pneu p LEFT JOIN FETCH p.vehicule WHERE p.status IN :statuses ORDER BY p.id")
    List<Pneu> findByStatusInWithVehicule(@org.springframework.data.repository.query.Param("statuses") List<String> statuses);
}