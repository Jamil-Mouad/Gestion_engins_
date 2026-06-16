package ma.intersig.fleetcore.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import ma.intersig.fleetcore.dto.response.KpiCoutsBreakdownDto;
import ma.intersig.fleetcore.dto.response.KpiCostHistoryDto;
import ma.intersig.fleetcore.dto.response.KpiDto;
import ma.intersig.fleetcore.dto.response.KpiInterventionByStatusDto;
import ma.intersig.fleetcore.dto.response.KpiTimeseriesPointDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.sql.Date;

@Service
@Transactional(readOnly = true)
public class KpiService {

    private static final Logger log = LoggerFactory.getLogger(KpiService.class);

    private final EntityManager entityManager;

    public KpiService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Cacheable("kpis")
    public KpiDto getHeadline() {
        Double disponibilite = querySingleDouble(
                "SELECT COALESCE(AVG(taux_dispo), 0) FROM mv_kpis_dispo");

        BigDecimal coutMensuelMad = querySingleBigDecimal(
                "SELECT COALESCE(SUM(cout_total_mad), 0) FROM mv_kpis_couts_mois " +
                "WHERE mois = (SELECT MAX(mois) FROM mv_kpis_couts_mois)");

        Long kmParcourusMois = querySingleLong(
                "SELECT COALESCE(SUM(km_parcourus_mois), 0) FROM mv_kpis_km_mois " +
                "WHERE mois = (SELECT MAX(mois) FROM mv_kpis_km_mois)");

        Long kmCumules = querySingleLong(
                "SELECT COALESCE(SUM(km_parcourus_mois), 0) FROM mv_kpis_km_mois");

        Long totalVehicules = querySingleLong("SELECT COUNT(*) FROM vehicules WHERE actif = TRUE");
        Long enService      = querySingleLong("SELECT COUNT(*) FROM vehicules WHERE actif = TRUE AND statut = 'in-service'");
        Long enAtelier      = querySingleLong("SELECT COUNT(*) FROM vehicules WHERE actif = TRUE AND statut = 'workshop'");
        Long enMaintenance  = querySingleLong("SELECT COUNT(*) FROM vehicules WHERE actif = TRUE AND statut = 'maintenance'");
        Long horsService    = querySingleLong("SELECT COUNT(*) FROM vehicules WHERE actif = TRUE AND statut = 'out-of-service'");

        String thisMonth = "DATE_TRUNC('month', CURRENT_DATE)";
        BigDecimal coutInterventionsMois = querySingleBigDecimal(
                "SELECT COALESCE(SUM(cout_total), 0) FROM interventions " +
                "WHERE DATE_TRUNC('month', date_debut) = " + thisMonth);
        BigDecimal coutMainOeuvre = querySingleBigDecimal(
                "SELECT COALESCE(SUM(cout_main_oeuvre), 0) FROM interventions " +
                "WHERE DATE_TRUNC('month', date_debut) = " + thisMonth);
        BigDecimal coutPieces = querySingleBigDecimal(
                "SELECT COALESCE(SUM(cout_pieces), 0) FROM interventions " +
                "WHERE DATE_TRUNC('month', date_debut) = " + thisMonth);
        BigDecimal coutSousTraitance = querySingleBigDecimal(
                "SELECT COALESCE(SUM(cout_sous_traitance), 0) FROM interventions " +
                "WHERE DATE_TRUNC('month', date_debut) = " + thisMonth);

        Long interventionsOuvertes = querySingleLong(
                "SELECT COUNT(*) FROM interventions WHERE date_fin IS NULL");
        Long vidangesEnRetard = querySingleLong(
                "SELECT COUNT(*) FROM suivi_vidanges WHERE statut = 'en_retard'");
        Long pneusWarnEmpty = querySingleLong(
                "SELECT COUNT(*) FROM pneus WHERE status IN ('warn', 'empty')");
        Long demandesEnAttente = querySingleLong(
                "SELECT COUNT(*) FROM demandes_achat WHERE statut = 'Nouvelle'");

        return new KpiDto(
                disponibilite,
                coutMensuelMad,
                kmParcourusMois != null ? kmParcourusMois : 0L,
                kmCumules != null ? kmCumules : 0L,
                totalVehicules != null ? totalVehicules : 0L,
                enService != null ? enService : 0L,
                enAtelier != null ? enAtelier : 0L,
                enMaintenance != null ? enMaintenance : 0L,
                horsService != null ? horsService : 0L,
                coutInterventionsMois,
                coutMainOeuvre,
                coutPieces,
                coutSousTraitance,
                interventionsOuvertes != null ? interventionsOuvertes : 0L,
                vidangesEnRetard != null ? vidangesEnRetard : 0L,
                pneusWarnEmpty != null ? pneusWarnEmpty : 0L,
                demandesEnAttente != null ? demandesEnAttente : 0L
        );
    }

    @Cacheable(value = "kpis", key = "'costHistory-' + #months")
    public List<KpiCostHistoryDto> getCostHistory(int months) {
        LocalDate cutoff = LocalDate.now().withDayOfMonth(1).minusMonths(Math.max(months - 1, 0));
        Query query = entityManager.createNativeQuery(
                "SELECT TO_CHAR(DATE_TRUNC('month', date_debut), 'YYYY-MM') AS month, " +
                "       COALESCE(SUM(cout_total), 0) AS cout_total " +
                "FROM interventions " +
                "WHERE date_debut >= :cutoff " +
                "GROUP BY DATE_TRUNC('month', date_debut) " +
                "ORDER BY month ASC");
        query.setParameter("cutoff", Date.valueOf(cutoff));

        List<?> results = query.getResultList();
        List<KpiCostHistoryDto> points = new ArrayList<>();
        for (Object row : results) {
            Object[] cols = (Object[]) row;
            String month = (String) cols[0];
            BigDecimal cout = cols[1] != null ? new BigDecimal(cols[1].toString()) : BigDecimal.ZERO;
            points.add(new KpiCostHistoryDto(month, cout));
        }
        return points;
    }

    @Cacheable(value = "kpis", key = "'interventionsByStatus'")
    public List<KpiInterventionByStatusDto> getInterventionsByStatus() {
        Long enCours  = querySingleLong("SELECT COUNT(*) FROM interventions WHERE date_fin IS NULL");
        Long cloture  = querySingleLong("SELECT COUNT(*) FROM interventions WHERE date_fin IS NOT NULL");
        return List.of(
                new KpiInterventionByStatusDto("en_cours", enCours != null ? enCours : 0L),
                new KpiInterventionByStatusDto("cloture",  cloture  != null ? cloture  : 0L)
        );
    }

    public List<KpiTimeseriesPointDto> getTimeseries(int mois) {
        Query query = entityManager.createNativeQuery(
                "SELECT TO_CHAR(jour, 'YYYY-MM') AS mois, AVG(taux_dispo) AS taux_dispo " +
                "FROM mv_kpis_dispo " +
                "GROUP BY TO_CHAR(jour, 'YYYY-MM') " +
                "ORDER BY mois DESC " +
                "LIMIT :mois");
        query.setParameter("mois", mois);

        List<?> results = query.getResultList();
        List<KpiTimeseriesPointDto> points = new ArrayList<>();

        for (Object row : results) {
            Object[] cols = (Object[]) row;
            String moisStr = (String) cols[0];
            Double tauxDispo = ((Number) cols[1]).doubleValue();
            points.add(new KpiTimeseriesPointDto(moisStr, tauxDispo));
        }
        return points;
    }

    public KpiCoutsBreakdownDto getCoutsBreakdown() {
        Query query = entityManager.createNativeQuery(
                "SELECT categorie, COALESCE(SUM(cout_total), 0) " +
                "FROM interventions " +
                "WHERE DATE_TRUNC('month', date_debut) = DATE_TRUNC('month', CURRENT_DATE) " +
                "GROUP BY categorie " +
                "ORDER BY categorie");

        List<?> results = query.getResultList();
        Map<String, BigDecimal> categories = new LinkedHashMap<>();
        BigDecimal total = BigDecimal.ZERO;

        for (Object row : results) {
            Object[] cols = (Object[]) row;
            String cat = (String) cols[0];
            BigDecimal val = (BigDecimal) cols[1];
            categories.put(cat, val);
            total = total.add(val);
        }

        String periode = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        return new KpiCoutsBreakdownDto(periode, categories, total);
    }

    public String getLastRefresh() {
        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT last_refresh::text FROM kpi_matview_refresh WHERE matview_name = 'mv_kpis_dispo'");
            List<?> results = query.getResultList();
            if (results.isEmpty()) {
                return null;
            }
            return (String) results.get(0);
        } catch (RuntimeException e) {
            log.warn("Failed to fetch KPI last refresh: {}", e.getMessage());
            return null;
        }
    }

    public KpiDto getVehiculeKpis(Long vehiculeId) {
        Double disponibilite = 0.0;
        try {
            Query q = entityManager.createNativeQuery(
                    "SELECT COALESCE(AVG(taux_dispo), 0) FROM mv_kpis_dispo WHERE vehicule_id = :vid LIMIT 1");
            q.setParameter("vid", vehiculeId);
            Object result = q.getSingleResult();
            if (result != null) disponibilite = ((Number) result).doubleValue();
        } catch (Exception e) {
            log.warn("Failed to fetch disponibilite for vehicule {}: {}", vehiculeId, e.getMessage());
        }

        BigDecimal coutTotal = BigDecimal.ZERO;
        try {
            Query q = entityManager.createNativeQuery(
                    "SELECT COALESCE(SUM(cout_total), 0) FROM interventions WHERE vehicule_id = :vid");
            q.setParameter("vid", vehiculeId);
            Object result = q.getSingleResult();
            if (result != null) coutTotal = new BigDecimal(result.toString());
        } catch (Exception e) {
            log.warn("Failed to fetch cout_total for vehicule {}: {}", vehiculeId, e.getMessage());
        }

        Long kmParcourus = 0L;
        try {
            Query q = entityManager.createNativeQuery(
                    "SELECT COALESCE(MAX(compteur_km), 0) FROM releves_compteur WHERE vehicule_id = :vid");
            q.setParameter("vid", vehiculeId);
            Object result = q.getSingleResult();
            if (result != null) kmParcourus = ((Number) result).longValue();
        } catch (Exception e) {
            log.warn("Failed to fetch km_parcourus for vehicule {}: {}", vehiculeId, e.getMessage());
        }

        return new KpiDto(
                disponibilite,
                coutTotal,
                kmParcourus,
                kmParcourus,
                0L, 0L, 0L, 0L, 0L,
                coutTotal, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                0L, 0L, 0L, 0L
        );
    }

    private Double querySingleDouble(String sql) {
        try {
            Query q = entityManager.createNativeQuery(sql);
            Object result = q.getSingleResult();
            return result != null ? ((Number) result).doubleValue() : 0.0;
        } catch (Exception e) {
            return 0.0;
        }
    }

    private BigDecimal querySingleBigDecimal(String sql) {
        try {
            Query q = entityManager.createNativeQuery(sql);
            Object result = q.getSingleResult();
            return result != null ? new BigDecimal(result.toString()) : BigDecimal.ZERO;
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private Long querySingleLong(String sql) {
        try {
            Query q = entityManager.createNativeQuery(sql);
            Object result = q.getSingleResult();
            return result != null ? ((Number) result).longValue() : 0L;
        } catch (Exception e) {
            return 0L;
        }
    }
}
