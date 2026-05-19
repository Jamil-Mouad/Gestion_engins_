package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.ImportsHistorique;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ImportsHistoriqueRepository extends JpaRepository<ImportsHistorique, Long> {

    Page<ImportsHistorique> findAllByOrderByCreatedAtDesc(Pageable pageable);
}