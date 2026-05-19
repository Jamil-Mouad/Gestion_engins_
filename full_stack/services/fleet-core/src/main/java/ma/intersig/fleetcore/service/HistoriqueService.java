package ma.intersig.fleetcore.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import ma.intersig.fleetcore.dto.response.HistoriqueItemDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class HistoriqueService {

    private final EntityManager entityManager;

    public HistoriqueService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public PageResponse<HistoriqueItemDto> list(Long vehiculeId, OffsetDateTime dateFrom,
                                                  OffsetDateTime dateTo, String type,
                                                  String partie, Pageable pageable) {
        StringBuilder sql = new StringBuilder();
        sql.append(buildUnionQuery());

        StringBuilder where = new StringBuilder();
        if (vehiculeId != null) {
            where.append(where.length() > 0 ? " AND " : " WHERE ");
            where.append("vehicule_id = :vehiculeId");
        }
        if (dateFrom != null) {
            where.append(where.length() > 0 ? " AND " : " WHERE ");
            where.append("date >= :dateFrom");
        }
        if (dateTo != null) {
            where.append(where.length() > 0 ? " AND " : " WHERE ");
            where.append("date <= :dateTo");
        }
        if (type != null && !type.isBlank()) {
            where.append(where.length() > 0 ? " AND " : " WHERE ");
            where.append("type = :typeFilter");
        }
        if (partie != null && !partie.isBlank()) {
            where.append(where.length() > 0 ? " AND " : " WHERE ");
            where.append("partie IS NOT NULL AND partie LIKE :partie");
        }

        String filteredSql = "SELECT * FROM (" + sql + ") AS hist" + where + " ORDER BY date DESC";
        String countSql = "SELECT COUNT(*) FROM (" + sql + ") AS hist" + where;

        Query countQuery = entityManager.createNativeQuery(countSql);
        Query dataQuery = entityManager.createNativeQuery(filteredSql);

        setQueryParams(countQuery, vehiculeId, dateFrom, dateTo, type, partie);
        setQueryParams(dataQuery, vehiculeId, dateFrom, dateTo, type, partie);

        dataQuery.setFirstResult((int) pageable.getOffset());
        dataQuery.setMaxResults(pageable.getPageSize());

        Number total = (Number) countQuery.getSingleResult();
        List<?> rows = dataQuery.getResultList();
        List<HistoriqueItemDto> items = mapRows(rows);

        return PageResponse.of(new PageImpl<>(items, pageable, total.longValue()));
    }

    private String buildUnionQuery() {
        return "SELECT 'intervention' AS type, id, vehicule_id, date_debut AS date, " +
                "categorie, partie, cout_total, NULL::integer AS compteur_km, NULL::varchar AS activity " +
                "FROM interventions " +
                "UNION ALL " +
                "SELECT 'releve' AS type, id, vehicule_id, date_releve AS date, " +
                "NULL::varchar AS categorie, NULL::varchar AS partie, NULL::numeric AS cout_total, " +
                "compteur_km, NULL::varchar AS activity " +
                "FROM releves_compteur " +
                "UNION ALL " +
                "SELECT 'pneu_inspection' AS type, pi.id, p.vehicule_id, pi.date_inspection AS date, " +
                "NULL::varchar AS categorie, NULL::varchar AS partie, NULL::numeric AS cout_total, " +
                "NULL::integer AS compteur_km, pi.activity " +
                "FROM pneu_inspections pi JOIN pneus p ON pi.pneu_id = p.id";
    }

    private void setQueryParams(Query query, Long vehiculeId, OffsetDateTime dateFrom,
                                OffsetDateTime dateTo, String type, String partie) {
        if (vehiculeId != null) {
            query.setParameter("vehiculeId", vehiculeId);
        }
        if (dateFrom != null) {
            query.setParameter("dateFrom", dateFrom);
        }
        if (dateTo != null) {
            query.setParameter("dateTo", dateTo);
        }
        if (type != null && !type.isBlank()) {
            query.setParameter("typeFilter", type);
        }
        if (partie != null && !partie.isBlank()) {
            query.setParameter("partie", partie + "%");
        }
    }

    private List<HistoriqueItemDto> mapRows(List<?> rows) {
        List<HistoriqueItemDto> items = new ArrayList<>();
        for (Object row : rows) {
            Object[] cols = (Object[]) row;
            String rowType = (String) cols[0];
            Long id = ((Number) cols[1]).longValue();
            Long vehId = ((Number) cols[2]).longValue();
            OffsetDateTime date = cols[3] instanceof java.sql.Timestamp ts
                    ? ts.toInstant().atOffset(java.time.ZoneOffset.UTC)
                    : (OffsetDateTime) cols[3];

            String categorie = cols[4] != null ? (String) cols[4] : null;
            String partieVal = cols[5] != null ? (String) cols[5] : null;
            BigDecimal coutTotal = cols[6] != null ? (BigDecimal) cols[6] : null;
            Integer compteurKm = cols[7] != null ? ((Number) cols[7]).intValue() : null;
            String activity = cols[8] != null ? (String) cols[8] : null;

            items.add(new HistoriqueItemDto(
                    rowType, id, vehId, date,
                    categorie, partieVal, coutTotal,
                    compteurKm, activity
            ));
        }
        return items;
    }
}