package ma.intersig.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record UserProfileDto(
    Long id,
    String email,
    String prenom,
    String nom,
    String fonction,
    @JsonProperty("matricule_emp") String matriculeEmp,
    String site,
    String telephone,
    @JsonProperty("dashboard_config") Object dashboardConfig,
    @JsonProperty("preferences_notifications") Object preferencesNotifications
) {}