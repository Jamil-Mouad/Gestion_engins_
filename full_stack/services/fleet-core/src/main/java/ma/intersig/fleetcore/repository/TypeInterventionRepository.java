package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.TypeIntervention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TypeInterventionRepository extends JpaRepository<TypeIntervention, Short> {
    Optional<TypeIntervention> findByLibelleIgnoreCase(String libelle);
}