package ma.intersig.magasin.repository;

import ma.intersig.magasin.entity.Citerne;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CiterneRepository extends JpaRepository<Citerne, Long> {

    Optional<Citerne> findFirstByActifTrueOrderByIdAsc();
}
