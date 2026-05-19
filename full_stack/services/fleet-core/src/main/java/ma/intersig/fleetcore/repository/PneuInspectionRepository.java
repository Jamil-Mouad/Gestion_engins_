package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.PneuInspection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PneuInspectionRepository extends JpaRepository<PneuInspection, Long> {

    Page<PneuInspection> findByPneuIdOrderByDateInspectionDesc(Long pneuId, Pageable pageable);
}