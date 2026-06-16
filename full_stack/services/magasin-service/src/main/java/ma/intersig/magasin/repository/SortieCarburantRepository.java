package ma.intersig.magasin.repository;

import ma.intersig.magasin.entity.SortieCarburant;
import ma.intersig.magasin.repository.projection.MonthlyConsoRow;
import ma.intersig.magasin.repository.projection.TopConsumerRow;
import ma.intersig.magasin.repository.projection.TypeRepartitionRow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SortieCarburantRepository extends JpaRepository<SortieCarburant, Long> {

    // :searchPattern must arrive pre-lowercased and %-wrapped (or null) — applying
    // LOWER/CONCAT to a null parameter makes Postgres infer bytea and blow up.
    @Query("""
            SELECT s FROM SortieCarburant s
            WHERE s.citerneId = :citerneId
              AND (CAST(:dateMin AS date) IS NULL OR s.dateSortie >= :dateMin)
              AND (CAST(:dateMax AS date) IS NULL OR s.dateSortie <= :dateMax)
              AND (:vehiculeCode IS NULL OR s.vehiculeCode = :vehiculeCode)
              AND (:searchPattern IS NULL
                   OR LOWER(s.destination) LIKE :searchPattern
                   OR LOWER(COALESCE(s.demandeur, '')) LIKE :searchPattern
                   OR LOWER(COALESCE(s.numeroBs, '')) LIKE :searchPattern
                   OR LOWER(COALESCE(s.vehiculeCode, '')) LIKE :searchPattern)
            """)
    Page<SortieCarburant> search(@Param("citerneId") Long citerneId,
                                 @Param("dateMin") LocalDate dateMin,
                                 @Param("dateMax") LocalDate dateMax,
                                 @Param("vehiculeCode") String vehiculeCode,
                                 @Param("searchPattern") String searchPattern,
                                 Pageable pageable);

    // Net dispensed liters up to a date: SORTIE adds, RETOUR subtracts.
    @Query("""
            SELECT COALESCE(SUM(CASE WHEN s.typeMouvement = 'RETOUR' THEN -s.quantiteLitres ELSE s.quantiteLitres END), 0)
            FROM SortieCarburant s
            WHERE s.citerneId = :citerneId AND s.dateSortie <= :date
            """)
    BigDecimal sumNetLitresUntil(@Param("citerneId") Long citerneId, @Param("date") LocalDate date);

    Optional<SortieCarburant> findFirstByCiterneIdOrderByDateSortieDescIdDesc(Long citerneId);

    @Query("""
            SELECT DISTINCT s.destination FROM SortieCarburant s
            WHERE LOWER(s.destination) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY s.destination
            """)
    List<String> suggestDestinations(@Param("q") String q, Pageable pageable);

    List<SortieCarburant> findByVehiculeIdAndDateSortieBetweenOrderByDateSortieAscIdAsc(
            Long vehiculeId, LocalDate from, LocalDate to);

    Optional<SortieCarburant> findFirstByVehiculeIdAndCompteurNotNullOrderByDateSortieDescIdDesc(Long vehiculeId);

    long deleteBySource(String source);

    boolean existsBySource(String source);

    @Query("""
            SELECT COALESCE(SUM(CASE WHEN s.typeMouvement = 'RETOUR' THEN -s.quantiteLitres ELSE s.quantiteLitres END), 0)
            FROM SortieCarburant s
            WHERE s.citerneId = :citerneId AND s.dateSortie BETWEEN :from AND :to
            """)
    BigDecimal sumNetLitresBetween(@Param("citerneId") Long citerneId,
                                   @Param("from") LocalDate from,
                                   @Param("to") LocalDate to);

    // Fleet-matched consumption: only dispensings resolved to a vehicules row,
    // the denominator of the per-vehicle "% conso vs flotte" KPI.
    @Query("""
            SELECT COALESCE(SUM(CASE WHEN s.typeMouvement = 'RETOUR' THEN -s.quantiteLitres ELSE s.quantiteLitres END), 0)
            FROM SortieCarburant s
            WHERE s.citerneId = :citerneId AND s.vehiculeId IS NOT NULL
              AND s.dateSortie BETWEEN :from AND :to
            """)
    BigDecimal sumNetLitresMatchedBetween(@Param("citerneId") Long citerneId,
                                          @Param("from") LocalDate from,
                                          @Param("to") LocalDate to);

    @Query("""
            SELECT COALESCE(SUM(CASE WHEN s.typeMouvement = 'RETOUR' THEN -s.quantiteLitres ELSE s.quantiteLitres END), 0)
            FROM SortieCarburant s
            WHERE s.vehiculeId = :vehiculeId AND s.dateSortie BETWEEN :from AND :to
            """)
    BigDecimal sumNetLitresForVehicule(@Param("vehiculeId") Long vehiculeId,
                                       @Param("from") LocalDate from,
                                       @Param("to") LocalDate to);

    long countByVehiculeIdAndTypeMouvementAndDateSortieBetween(
            Long vehiculeId, String typeMouvement, LocalDate from, LocalDate to);

    Optional<SortieCarburant> findFirstByVehiculeIdAndCompteurNotNullAndDateSortieBeforeOrderByDateSortieDescIdDesc(
            Long vehiculeId, LocalDate date);

    @Query("""
            SELECT DISTINCT s.vehiculeId FROM SortieCarburant s
            WHERE s.citerneId = :citerneId AND s.vehiculeId IS NOT NULL
              AND s.dateSortie BETWEEN :from AND :to
            """)
    List<Long> vehiculeIdsWithSorties(@Param("citerneId") Long citerneId,
                                      @Param("from") LocalDate from,
                                      @Param("to") LocalDate to);

    @Query(value = """
            SELECT COALESCE(s.vehicule_code, TRIM(s.destination)) AS "label",
                   MIN(s.vehicule_id) AS "vehiculeId",
                   SUM(CASE WHEN s.type_mouvement = 'RETOUR' THEN -s.quantite_litres ELSE s.quantite_litres END) AS "litres",
                   COUNT(*) FILTER (WHERE s.type_mouvement = 'SORTIE') AS "nbSorties"
            FROM sortie_carburant s
            WHERE s.citerne_id = :citerneId AND s.date_sortie BETWEEN :from AND :to
            GROUP BY COALESCE(s.vehicule_code, TRIM(s.destination))
            ORDER BY "litres" DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<TopConsumerRow> topConsumers(@Param("citerneId") Long citerneId,
                                      @Param("from") LocalDate from,
                                      @Param("to") LocalDate to,
                                      @Param("limit") int limit);

    @Query(value = """
            SELECT to_char(date_trunc('month', s.date_sortie), 'YYYY-MM') AS "mois",
                   SUM(CASE WHEN s.type_mouvement = 'RETOUR' THEN -s.quantite_litres ELSE s.quantite_litres END) AS "litres"
            FROM sortie_carburant s
            WHERE s.citerne_id = :citerneId AND s.date_sortie BETWEEN :from AND :to
            GROUP BY 1
            ORDER BY 1
            """, nativeQuery = true)
    List<MonthlyConsoRow> consoParMois(@Param("citerneId") Long citerneId,
                                       @Param("from") LocalDate from,
                                       @Param("to") LocalDate to);

    @Query(value = """
            SELECT CASE WHEN s.tiers THEN 'tiers'
                        WHEN v.type IS NOT NULL THEN v.type
                        ELSE 'engin' END AS "categorie",
                   SUM(CASE WHEN s.type_mouvement = 'RETOUR' THEN -s.quantite_litres ELSE s.quantite_litres END) AS "litres"
            FROM sortie_carburant s
            LEFT JOIN vehicules v ON v.id = s.vehicule_id
            WHERE s.citerne_id = :citerneId AND s.date_sortie BETWEEN :from AND :to
            GROUP BY 1
            ORDER BY "litres" DESC
            """, nativeQuery = true)
    List<TypeRepartitionRow> repartitionParType(@Param("citerneId") Long citerneId,
                                                @Param("from") LocalDate from,
                                                @Param("to") LocalDate to);
}
