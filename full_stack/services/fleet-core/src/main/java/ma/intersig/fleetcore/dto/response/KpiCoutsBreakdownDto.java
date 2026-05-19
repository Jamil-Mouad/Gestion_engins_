package ma.intersig.fleetcore.dto.response;

import java.math.BigDecimal;
import java.util.Map;

public record KpiCoutsBreakdownDto(
        String periode,
        Map<String, BigDecimal> categories,
        BigDecimal total
) {}