package ma.intersig.fleetcore.dto.response;

import java.math.BigDecimal;

public record KpiCostHistoryDto(String month, BigDecimal coutTotal) {}
