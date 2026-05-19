package ma.intersig.fleetcore.service;

import jakarta.persistence.EntityManager;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.dto.response.PlanningWeekDto;
import ma.intersig.fleetcore.dto.response.SuiviVidangeDto;
import ma.intersig.fleetcore.dto.response.VidangePlanItemDto;
import ma.intersig.fleetcore.entity.SuiviVidange;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.SuiviVidangeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class VidangeService {

    private static final int HOURS_PER_INTERVAL = 500;
    private static final int DAYS_PER_INTERVAL = 30;

    private static final java.time.format.DateTimeFormatter WEEK_FORMATTER = new DateTimeFormatterBuilder()
            .appendValue(WeekFields.ISO.weekBasedYear(), 4)
            .appendLiteral("-W")
            .appendValue(WeekFields.ISO.weekOfWeekBasedYear(), 2)
            .toFormatter(Locale.ROOT);

    private final SuiviVidangeRepository suiviVidangeRepository;

    @jakarta.persistence.PersistenceContext
    private EntityManager entityManager;

    public VidangeService(SuiviVidangeRepository suiviVidangeRepository) {
        this.suiviVidangeRepository = suiviVidangeRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<SuiviVidangeDto> list(String statut, Pageable pageable) {
        Page<SuiviVidange> page;
        if (statut != null && !statut.isBlank()) {
            page = suiviVidangeRepository.findByStatut(statut, pageable);
        } else {
            page = suiviVidangeRepository.findAll(pageable);
        }
        return PageResponse.of(page.map(SuiviVidangeDto::from));
    }

    @Transactional(readOnly = true)
    public List<SuiviVidangeDto> listByVehicule(Long vehiculeId, String statut) {
        List<SuiviVidange> rows = (statut != null && !statut.isBlank())
                ? suiviVidangeRepository.findByVehiculeIdAndStatut(vehiculeId, statut)
                : suiviVidangeRepository.findByVehiculeId(vehiculeId);
        return rows.stream().map(SuiviVidangeDto::from).toList();
    }

    public SuiviVidangeDto cloturer(Long id) {
        SuiviVidange v = suiviVidangeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vidange not found", "VIDANGE_NOT_FOUND"));
        if ("fait".equals(v.getStatut())) {
            throw new BusinessException("Vidange already closed", "ALREADY_CLOSED", 422);
        }
        v.setStatut("fait");
        v.setDateDernierEntretien(LocalDate.now());
        Integer intervalle = v.getIntervalleNbh();
        v.setProchainEntretienEstime(intervalle != null && intervalle > 0
                ? LocalDate.now().plusDays(Math.round((double) DAYS_PER_INTERVAL * intervalle / HOURS_PER_INTERVAL))
                : null);
        v = suiviVidangeRepository.save(v);
        // flush+refresh to pick up DB-computed nbh_restant (set by V4 trigger after UPDATE)
        entityManager.flush();
        entityManager.refresh(v);
        return SuiviVidangeDto.from(v);
    }

    @Transactional(readOnly = true)
    public List<PlanningWeekDto> planning(int semaines) {
        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.with(DayOfWeek.MONDAY);

        LocalDate planningEnd = startOfWeek.plusWeeks(semaines).plusDays(6);
        List<SuiviVidange> upcoming = suiviVidangeRepository
                .findByStatutInAndProchainEntretienEstimeBetween(
                        List.of("a_faire", "en_cours", "depasse"),
                        startOfWeek, planningEnd);

        List<PlanningWeekDto> weeks = new ArrayList<>();
        for (int i = 0; i < semaines; i++) {
            LocalDate weekStart = startOfWeek.plusWeeks(i);
            LocalDate weekEnd = weekStart.plusDays(6);
            String weekLabel = weekStart.format(WEEK_FORMATTER);

            List<VidangePlanItemDto> items = upcoming.stream()
                    .filter(v -> {
                        LocalDate pe = v.getProchainEntretienEstime();
                        return pe != null && !pe.isBefore(weekStart) && !pe.isAfter(weekEnd);
                    })
                    .map(v -> new VidangePlanItemDto(
                            v.getId(),
                            v.getVehicule() != null ? v.getVehicule().getCode() : null,
                            v.getComposant() != null ? v.getComposant().getDesignation() : null,
                            v.getStatut(),
                            v.getIntervalleNbh(),
                            v.getNbhRestant()
                    ))
                    .toList();

            weeks.add(new PlanningWeekDto(weekLabel, weekStart, weekEnd, items));
        }
        return weeks;
    }
}