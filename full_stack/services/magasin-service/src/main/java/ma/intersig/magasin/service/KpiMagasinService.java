package ma.intersig.magasin.service;

import ma.intersig.magasin.dto.response.DashboardKpiDto;
import ma.intersig.magasin.dto.response.VehiculeKpiDto;
import ma.intersig.magasin.entity.Citerne;
import ma.intersig.magasin.entity.SortieCarburant;
import ma.intersig.magasin.entity.VehiculeRef;
import ma.intersig.magasin.exception.ResourceNotFoundException;
import ma.intersig.magasin.repository.ArrivageRepository;
import ma.intersig.magasin.repository.JaugeageRepository;
import ma.intersig.magasin.repository.SortieCarburantRepository;
import ma.intersig.magasin.repository.VehiculeRefRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
public class KpiMagasinService {

    // The Excel log contains odometers that jump or go backwards; deltas above
    // this cap (km per fill-up) are treated as data errors and skipped.
    private static final BigDecimal MAX_DELTA_KM = BigDecimal.valueOf(2000);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final CiterneService citerneService;
    private final StockService stockService;
    private final ArrivageRepository arrivageRepository;
    private final SortieCarburantRepository sortieRepository;
    private final JaugeageRepository jaugeageRepository;
    private final VehiculeLookup vehiculeLookup;
    private final VehiculeRefRepository vehiculeRefRepository;

    public KpiMagasinService(CiterneService citerneService,
                             StockService stockService,
                             ArrivageRepository arrivageRepository,
                             SortieCarburantRepository sortieRepository,
                             JaugeageRepository jaugeageRepository,
                             VehiculeLookup vehiculeLookup,
                             VehiculeRefRepository vehiculeRefRepository) {
        this.citerneService = citerneService;
        this.stockService = stockService;
        this.arrivageRepository = arrivageRepository;
        this.sortieRepository = sortieRepository;
        this.jaugeageRepository = jaugeageRepository;
        this.vehiculeLookup = vehiculeLookup;
        this.vehiculeRefRepository = vehiculeRefRepository;
    }

    @Transactional(readOnly = true)
    public DashboardKpiDto dashboard(YearMonth month) {
        Citerne citerne = citerneService.getActive();
        LocalDate today = LocalDate.now();
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();

        BigDecimal stock = stockService.stockTheorique(citerne, today);
        BigDecimal pctRemplissage = null;
        if (citerne.getCapaciteLitres() != null && citerne.getCapaciteLitres().signum() > 0) {
            pctRemplissage = stock.multiply(HUNDRED)
                    .divide(citerne.getCapaciteLitres(), 1, RoundingMode.HALF_UP);
        }

        DashboardKpiDto.DernierJaugeage dernierJaugeage = jaugeageRepository
                .findFirstByCiterneIdOrderByDateJaugeageDesc(citerne.getId())
                .map(j -> {
                    BigDecimal ecartPct = null;
                    if (j.getLitresTheoriques() != null && j.getLitresTheoriques().signum() != 0) {
                        ecartPct = j.getEcartLitres().multiply(HUNDRED)
                                .divide(j.getLitresTheoriques(), 1, RoundingMode.HALF_UP);
                    }
                    return new DashboardKpiDto.DernierJaugeage(j.getDateJaugeage(), j.getHauteurCm(),
                            j.getLitresMesures(), j.getLitresTheoriques(), j.getEcartLitres(), ecartPct);
                })
                .orElse(null);

        BigDecimal consoMois = sortieRepository.sumNetLitresBetween(citerne.getId(), from, to);
        BigDecimal consoMoisValeur = null;
        BigDecimal valeurPricee = arrivageRepository.sumValeurArrivagesPrices(citerne.getId());
        BigDecimal litresPrices = arrivageRepository.sumLitresArrivagesPrices(citerne.getId());
        if (valeurPricee != null && litresPrices.signum() > 0) {
            BigDecimal puMoyen = valeurPricee.divide(litresPrices, 6, RoundingMode.HALF_UP);
            consoMoisValeur = consoMois.multiply(puMoyen).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal conso30j = sortieRepository.sumNetLitresBetween(citerne.getId(), today.minusDays(29), today);
        BigDecimal consoMoyenneJour = conso30j.divide(BigDecimal.valueOf(30), 1, RoundingMode.HALF_UP);
        BigDecimal autonomieJours = null;
        if (consoMoyenneJour.signum() > 0 && stock.signum() > 0) {
            autonomieJours = stock.divide(consoMoyenneJour, 1, RoundingMode.HALF_UP);
        }

        DashboardKpiDto.DernierArrivage dernierArrivage = arrivageRepository
                .findFirstByCiterneIdOrderByDateArrivageDescIdDesc(citerne.getId())
                .map(a -> new DashboardKpiDto.DernierArrivage(a.getDateArrivage(), a.getQuantiteLitres(),
                        a.getFournisseur()))
                .orElse(null);

        BigDecimal arrivagesAnnee = arrivageRepository.sumLitresBetween(
                citerne.getId(), today.withDayOfYear(1), today);

        List<DashboardKpiDto.TopConsommateur> top = sortieRepository
                .topConsumers(citerne.getId(), from, to, 10).stream()
                .map(r -> new DashboardKpiDto.TopConsommateur(r.getLabel(), r.getVehiculeId(), r.getLitres(),
                        r.getNbSorties() == null ? 0 : r.getNbSorties()))
                .toList();

        List<DashboardKpiDto.ConsoMois> serie = sortieRepository
                .consoParMois(citerne.getId(), month.minusMonths(11).atDay(1), to).stream()
                .map(r -> new DashboardKpiDto.ConsoMois(r.getMois(), r.getLitres()))
                .toList();

        List<DashboardKpiDto.RepartitionType> repartition = sortieRepository
                .repartitionParType(citerne.getId(), from, to).stream()
                .map(r -> new DashboardKpiDto.RepartitionType(r.getCategorie(), r.getLitres()))
                .toList();

        return new DashboardKpiDto(month.toString(), stock, citerneService.toTonnes(stock, citerne),
                citerne.getCapaciteLitres(), pctRemplissage, citerne.getHauteurMaxCm(),
                citerne.getDensiteKgParLitre(), dernierJaugeage, consoMois, consoMoisValeur,
                consoMoyenneJour, autonomieJours, dernierArrivage, arrivagesAnnee,
                top, serie, repartition);
    }

    @Transactional(readOnly = true)
    public VehiculeKpiDto vehicule(String code, String type, YearMonth month) {
        Citerne citerne = citerneService.getActive();
        VehiculeRef vehicule = vehiculeLookup.resolveByCode(code, type)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Véhicule introuvable pour le code: " + code, "VEHICULE_NOT_FOUND"));
        BigDecimal flotteLitres = sortieRepository.sumNetLitresMatchedBetween(
                citerne.getId(), month.atDay(1), month.atEndOfMonth());
        return compute(vehicule, month, flotteLitres);
    }

    /** Monthly KPIs for every vehicle with at least one dispensing that month. */
    @Transactional(readOnly = true)
    public List<VehiculeKpiDto> allVehicules(YearMonth month) {
        Citerne citerne = citerneService.getActive();
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        List<Long> ids = sortieRepository.vehiculeIdsWithSorties(citerne.getId(), from, to);
        BigDecimal flotteLitres = sortieRepository.sumNetLitresMatchedBetween(citerne.getId(), from, to);
        return vehiculeRefRepository.findAllById(ids).stream()
                .sorted(java.util.Comparator.comparing(VehiculeRef::getCode))
                .map(v -> compute(v, month, flotteLitres))
                .toList();
    }

    private VehiculeKpiDto compute(VehiculeRef vehicule, YearMonth month, BigDecimal flotteLitres) {
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();

        long voyages = sortieRepository.countByVehiculeIdAndTypeMouvementAndDateSortieBetween(
                vehicule.getId(), "SORTIE", from, to);
        BigDecimal consoLitres = sortieRepository.sumNetLitresForVehicule(vehicule.getId(), from, to);

        BigDecimal kmMois = kmParcourus(vehicule.getId(), from, to);

        BigDecimal kmCumules = sortieRepository
                .findFirstByVehiculeIdAndCompteurNotNullOrderByDateSortieDescIdDesc(vehicule.getId())
                .map(SortieCarburant::getCompteur)
                .orElse(vehicule.getCompteurKm() == null ? null : BigDecimal.valueOf(vehicule.getCompteurKm()));

        BigDecimal consoMoyenneL100 = null;
        if (kmMois != null && kmMois.signum() > 0) {
            consoMoyenneL100 = consoLitres.multiply(HUNDRED).divide(kmMois, 1, RoundingMode.HALF_UP);
        }

        BigDecimal pctVsFlotte = null;
        if (flotteLitres != null && flotteLitres.signum() > 0) {
            pctVsFlotte = consoLitres.multiply(HUNDRED).divide(flotteLitres, 1, RoundingMode.HALF_UP);
        }

        return new VehiculeKpiDto(vehicule.getId(), vehicule.getCode(), vehicule.getType(), month.toString(),
                voyages, kmMois, kmCumules, consoLitres, consoMoyenneL100, pctVsFlotte);
    }

    /**
     * Sums odometer deltas between consecutive readings of the month, seeded
     * with the last reading before the month. Deltas ≤ 0 or above
     * {@link #MAX_DELTA_KM} are skipped (the log contains odometers that go
     * backwards), but each reading still becomes the new reference so the
     * series re-syncs after a bad entry. Returns null when no delta is usable.
     */
    private BigDecimal kmParcourus(Long vehiculeId, LocalDate from, LocalDate to) {
        BigDecimal previous = sortieRepository
                .findFirstByVehiculeIdAndCompteurNotNullAndDateSortieBeforeOrderByDateSortieDescIdDesc(vehiculeId, from)
                .map(SortieCarburant::getCompteur)
                .orElse(null);
        BigDecimal total = null;
        for (SortieCarburant s : sortieRepository
                .findByVehiculeIdAndDateSortieBetweenOrderByDateSortieAscIdAsc(vehiculeId, from, to)) {
            if (s.getCompteur() == null) continue;
            if (previous != null) {
                BigDecimal delta = s.getCompteur().subtract(previous);
                if (delta.signum() > 0 && delta.compareTo(MAX_DELTA_KM) <= 0) {
                    total = total == null ? delta : total.add(delta);
                }
            }
            previous = s.getCompteur();
        }
        return total;
    }
}
