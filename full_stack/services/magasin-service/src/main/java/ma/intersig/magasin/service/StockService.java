package ma.intersig.magasin.service;

import ma.intersig.magasin.entity.Citerne;
import ma.intersig.magasin.repository.ArrivageRepository;
import ma.intersig.magasin.repository.SortieCarburantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class StockService {

    private final ArrivageRepository arrivageRepository;
    private final SortieCarburantRepository sortieRepository;

    public StockService(ArrivageRepository arrivageRepository,
                        SortieCarburantRepository sortieRepository) {
        this.arrivageRepository = arrivageRepository;
        this.sortieRepository = sortieRepository;
    }

    /**
     * Theoretical stock at end of {@code date}:
     * stock initial + Σ arrivages(≤ date) − Σ sorties nettes(≤ date).
     * Movements before the initial-stock date are excluded — the initial stock
     * already accounts for them.
     */
    @Transactional(readOnly = true)
    public BigDecimal stockTheorique(Citerne citerne, LocalDate date) {
        if (date.isBefore(citerne.getStockInitialDate())) {
            return citerne.getStockInitialLitres();
        }
        BigDecimal arrivages = arrivageRepository.sumLitresUntil(citerne.getId(), date)
                .subtract(arrivageRepository.sumLitresUntil(citerne.getId(), citerne.getStockInitialDate().minusDays(1)));
        BigDecimal sorties = sortieRepository.sumNetLitresUntil(citerne.getId(), date)
                .subtract(sortieRepository.sumNetLitresUntil(citerne.getId(), citerne.getStockInitialDate().minusDays(1)));
        return citerne.getStockInitialLitres().add(arrivages).subtract(sorties);
    }
}
