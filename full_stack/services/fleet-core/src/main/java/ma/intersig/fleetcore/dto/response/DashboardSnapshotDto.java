package ma.intersig.fleetcore.dto.response;

import java.util.List;

public record DashboardSnapshotDto(
    KpiDto kpis,
    List<KpiCostHistoryDto> costHistory,
    List<KpiInterventionByStatusDto> interventionsByStatus
) {}
