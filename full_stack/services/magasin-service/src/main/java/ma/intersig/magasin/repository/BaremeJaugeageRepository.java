package ma.intersig.magasin.repository;

import ma.intersig.magasin.entity.BaremeJaugeage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BaremeJaugeageRepository extends JpaRepository<BaremeJaugeage, Long> {

    List<BaremeJaugeage> findByCiterneIdOrderByHauteurCmAsc(Long citerneId);

    void deleteByCiterneId(Long citerneId);
}
