package ma.intersig.fleetcore.dto.report;

import java.util.ArrayList;
import java.util.List;

public record ImportReportDto(
        int lignesTotal,
        int lignesOk,
        int lignesErreur,
        List<ImportRowError> details
) {
    public static ImportReportDto of(int total, int ok, int erreur, List<ImportRowError> details) {
        return new ImportReportDto(total, ok, erreur, details);
    }

    public record ImportRowError(
            int row,
            String field,
            String raison
    ) {}
}