package ma.intersig.magasin.repository;

import ma.intersig.magasin.entity.Arrivage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

public interface ArrivageRepository extends JpaRepository<Arrivage, Long> {

    @Query("""
            SELECT a FROM Arrivage a
            WHERE a.citerneId = :citerneId
              AND (CAST(:dateMin AS date) IS NULL OR a.dateArrivage >= :dateMin)
              AND (CAST(:dateMax AS date) IS NULL OR a.dateArrivage <= :dateMax)
            """)
    Page<Arrivage> search(@Param("citerneId") Long citerneId,
                          @Param("dateMin") LocalDate dateMin,
                          @Param("dateMax") LocalDate dateMax,
                          Pageable pageable);

    @Query("SELECT COALESCE(SUM(a.quantiteLitres), 0) FROM Arrivage a WHERE a.citerneId = :citerneId AND a.dateArrivage <= :date")
    BigDecimal sumLitresUntil(@Param("citerneId") Long citerneId, @Param("date") LocalDate date);

    Optional<Arrivage> findFirstByCiterneIdOrderByDateArrivageDescIdDesc(Long citerneId);

    long deleteBySource(String source);

    @Query("SELECT COALESCE(SUM(a.quantiteLitres), 0) FROM Arrivage a WHERE a.citerneId = :citerneId AND a.dateArrivage BETWEEN :from AND :to")
    BigDecimal sumLitresBetween(@Param("citerneId") Long citerneId,
                                @Param("from") LocalDate from,
                                @Param("to") LocalDate to);

    // Weighted average unit price: only priced deliveries count (the Excel
    // often omits the PU).
    @Query("""
            SELECT SUM(a.quantiteLitres * a.prixUnitaireHt)
            FROM Arrivage a
            WHERE a.citerneId = :citerneId AND a.prixUnitaireHt IS NOT NULL
            """)
    BigDecimal sumValeurArrivagesPrices(@Param("citerneId") Long citerneId);

    @Query("""
            SELECT COALESCE(SUM(a.quantiteLitres), 0)
            FROM Arrivage a
            WHERE a.citerneId = :citerneId AND a.prixUnitaireHt IS NOT NULL
            """)
    BigDecimal sumLitresArrivagesPrices(@Param("citerneId") Long citerneId);
}
