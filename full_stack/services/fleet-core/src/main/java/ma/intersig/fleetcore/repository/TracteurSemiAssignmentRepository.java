package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.TracteurSemiAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TracteurSemiAssignmentRepository extends JpaRepository<TracteurSemiAssignment, Long> {

    // Active (currently attached) lookups
    Optional<TracteurSemiAssignment> findByTracteurIdAndDateFinIsNullAndActifTrue(Long tracteurId);
    Optional<TracteurSemiAssignment> findBySemiIdAndDateFinIsNullAndActifTrue(Long semiId);

    // Existence checks (used by service before insert)
    boolean existsByTracteurIdAndDateFinIsNullAndActifTrue(Long tracteurId);
    boolean existsBySemiIdAndDateFinIsNullAndActifTrue(Long semiId);

    // Full history (all records, active or terminated)
    List<TracteurSemiAssignment> findByTracteurIdAndActifTrueOrderByDateDebutDesc(Long tracteurId);
    List<TracteurSemiAssignment> findBySemiIdAndActifTrueOrderByDateDebutDesc(Long semiId);
}
