package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;



@Entity
@Table(name = "users")
public class User {

    @Id
    private Long id;

    @Column(nullable = false, length = 120)
    private String email;

    @Column(nullable = false, length = 60)
    private String prenom;

    @Column(nullable = false, length = 60)
    private String nom;

    @Column(name = "dashboard_config", columnDefinition = "jsonb")
    private String dashboardConfig;

    @Column(name = "preferences_notifications", columnDefinition = "jsonb")
    private String preferencesNotifications;

    @Column(nullable = false)
    private Boolean actif = true;

    @Column(nullable = false, length = 32)
    private String role = "USER";

    @Column(length = 20)
    private String telephone;

    @Column(name = "created_at", insertable = false, updatable = false)
    private java.time.OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private java.time.OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getDashboardConfig() { return dashboardConfig; }
    public void setDashboardConfig(String dashboardConfig) { this.dashboardConfig = dashboardConfig; }
    public String getPreferencesNotifications() { return preferencesNotifications; }
    public void setPreferencesNotifications(String preferencesNotifications) { this.preferencesNotifications = preferencesNotifications; }
    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    public java.time.OffsetDateTime getCreatedAt() { return createdAt; }
    public java.time.OffsetDateTime getUpdatedAt() { return updatedAt; }
}