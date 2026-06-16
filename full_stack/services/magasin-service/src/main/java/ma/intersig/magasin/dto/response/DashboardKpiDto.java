package ma.intersig.magasin.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardKpiDto(
        String month,
        BigDecimal stockActuelLitres,
        BigDecimal stockActuelTonnes,
        BigDecimal capaciteLitres,
        BigDecimal pctRemplissage,
        BigDecimal hauteurMaxCm,
        BigDecimal densiteKgParLitre,
        DernierJaugeage dernierJaugeage,
        BigDecimal consoMoisLitres,
        BigDecimal consoMoisValeurHt,
        BigDecimal consoMoyenneJourLitres,
        BigDecimal autonomieJours,
        DernierArrivage dernierArrivage,
        BigDecimal arrivagesAnneeLitres,
        List<TopConsommateur> topConsommateurs,
        List<ConsoMois> consoParMois,
        List<RepartitionType> repartitionParType
) {
    public record DernierJaugeage(LocalDate date, BigDecimal hauteurCm, BigDecimal litresMesures,
                                  BigDecimal litresTheoriques, BigDecimal ecartLitres, BigDecimal ecartPct) {}

    public record DernierArrivage(LocalDate date, BigDecimal quantiteLitres, String fournisseur) {}

    public record TopConsommateur(String label, Long vehiculeId, BigDecimal litres, long nbSorties) {}

    public record ConsoMois(String mois, BigDecimal litres) {}

    public record RepartitionType(String categorie, BigDecimal litres) {}
}
