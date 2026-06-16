package ma.intersig.magasin.dto.response;

import java.util.List;
import java.util.Map;

public record ImportGasoilReport(
        int sortiesImportees,
        int arrivagesImportes,
        int sortiesSupprimees,
        int arrivagesSupprimes,
        int lignesIgnorees,
        Map<String, Integer> codesNonResolus,
        List<String> anomalies
) {}
