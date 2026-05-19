package ma.intersig.fleetcore.dto.request;

import java.math.BigDecimal;

public record CreateInspectionRequest(
        BigDecimal pressionPsi,
        Short profondeur32e,
        String activity,
        String notes
) {}