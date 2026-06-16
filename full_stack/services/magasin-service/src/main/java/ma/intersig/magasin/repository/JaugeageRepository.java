package ma.intersig.magasin.repository;

import ma.intersig.magasin.entity.Jaugeage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface JaugeageRepository extends JpaRepository<Jaugeage, Long> {

    Page<Jaugeage> findByCiterneIdOrderByDateJaugeageDesc(Long citerneId, Pageable pageable);

    Optional<Jaugeage> findFirstByCiterneIdOrderByDateJaugeageDesc(Long citerneId);

    Optional<Jaugeage> findByCiterneIdAndDateJaugeage(Long citerneId, LocalDate date);
}
