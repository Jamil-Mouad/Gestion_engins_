package ma.intersig.gateway.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 120)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 60)
    private String prenom;

    @Column(nullable = false, length = 60)
    private String nom;

    @Column(length = 60)
    private String fonction;

    @Column(name = "matricule_emp", length = 30)
    private String matriculeEmp;

    @Column(length = 60)
    private String site;

    @Column(length = 20)
    private String telephone;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dashboard_config", columnDefinition = "jsonb")
    private String dashboardConfig = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferences_notifications", columnDefinition = "jsonb")
    private String preferencesNotifications = "{}";

    @Column(name = "refresh_token", length = 512)
    private String refreshToken;

    @Column(name = "refresh_token_expires_at")
    private OffsetDateTime refreshTokenExpiresAt;

    @Column(name = "password_reset_otp", length = 6)
    private String passwordResetOtp;

    @Column(name = "password_reset_otp_expires_at")
    private OffsetDateTime passwordResetOtpExpiresAt;

    @Column(name = "password_reset_otp_used_at")
    private OffsetDateTime passwordResetOtpUsedAt;

    @Column(name = "password_reset_token", length = 64)
    private String passwordResetToken;

    @Column(name = "password_reset_token_expires_at")
    private OffsetDateTime passwordResetTokenExpiresAt;

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getFonction() { return fonction; }
    public void setFonction(String fonction) { this.fonction = fonction; }

    public String getMatriculeEmp() { return matriculeEmp; }
    public void setMatriculeEmp(String matriculeEmp) { this.matriculeEmp = matriculeEmp; }

    public String getSite() { return site; }
    public void setSite(String site) { this.site = site; }

    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }

    public String getDashboardConfig() { return dashboardConfig; }
    public void setDashboardConfig(String dashboardConfig) { this.dashboardConfig = dashboardConfig; }

    public String getPreferencesNotifications() { return preferencesNotifications; }
    public void setPreferencesNotifications(String preferencesNotifications) { this.preferencesNotifications = preferencesNotifications; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public OffsetDateTime getRefreshTokenExpiresAt() { return refreshTokenExpiresAt; }
    public void setRefreshTokenExpiresAt(OffsetDateTime refreshTokenExpiresAt) { this.refreshTokenExpiresAt = refreshTokenExpiresAt; }

    public String getPasswordResetOtp() { return passwordResetOtp; }
    public void setPasswordResetOtp(String passwordResetOtp) { this.passwordResetOtp = passwordResetOtp; }

    public OffsetDateTime getPasswordResetOtpExpiresAt() { return passwordResetOtpExpiresAt; }
    public void setPasswordResetOtpExpiresAt(OffsetDateTime passwordResetOtpExpiresAt) { this.passwordResetOtpExpiresAt = passwordResetOtpExpiresAt; }

    public OffsetDateTime getPasswordResetOtpUsedAt() { return passwordResetOtpUsedAt; }
    public void setPasswordResetOtpUsedAt(OffsetDateTime passwordResetOtpUsedAt) { this.passwordResetOtpUsedAt = passwordResetOtpUsedAt; }

    public String getPasswordResetToken() { return passwordResetToken; }
    public void setPasswordResetToken(String passwordResetToken) { this.passwordResetToken = passwordResetToken; }

    public OffsetDateTime getPasswordResetTokenExpiresAt() { return passwordResetTokenExpiresAt; }
    public void setPasswordResetTokenExpiresAt(OffsetDateTime passwordResetTokenExpiresAt) { this.passwordResetTokenExpiresAt = passwordResetTokenExpiresAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}