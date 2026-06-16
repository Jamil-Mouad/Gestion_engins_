package ma.intersig.magasin.repository;

import ma.intersig.magasin.entity.VehiculeRef;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VehiculeRefRepository extends JpaRepository<VehiculeRef, Long> {

    List<VehiculeRef> findByCodeAndActifTrue(String code);

    // The fuel log records bare numbers (409) while vehicules.code carries a
    // type prefix (CAM-409, CHR-428) — accept exact matches and «…-409».
    @Query("""
            SELECT v FROM VehiculeRef v
            WHERE v.actif = true
              AND (v.code = :code OR v.code LIKE CONCAT('%-', :code))
            """)
    List<VehiculeRef> findByCodeForResolution(@Param("code") String code);

    @Query("""
            SELECT v FROM VehiculeRef v
            WHERE v.actif = true
              AND (LOWER(v.code) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(v.marque) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(v.matricule, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY v.code
            """)
    List<VehiculeRef> suggest(@Param("q") String q, Pageable pageable);
}
