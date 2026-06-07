package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    @Column(nullable = false, length = 15)
    private String severite;

    @Column(nullable = false, length = 20)
    private String categorie;

    @Column(nullable = false, length = 120)
    private String titre;

    private String detail;

    @Column(name = "target_screen", length = 30)
    private String targetScreen;

    @Column(name = "target_id")
    private Long targetId;

    @Column(nullable = false)
    private Boolean lu = false;

    @Column(name = "email_envoye", nullable = false)
    private Boolean emailEnvoye = false;

    @Column(name = "email_sent_at")
    private OffsetDateTime emailSentAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }
    public String getSeverite() { return severite; }
    public void setSeverite(String severite) { this.severite = severite; }
    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public String getTargetScreen() { return targetScreen; }
    public void setTargetScreen(String targetScreen) { this.targetScreen = targetScreen; }
    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }
    public Boolean getLu() { return lu; }
    public void setLu(Boolean lu) { this.lu = lu; }
    public Boolean getEmailEnvoye() { return emailEnvoye; }
    public void setEmailEnvoye(Boolean emailEnvoye) { this.emailEnvoye = emailEnvoye; }
    public OffsetDateTime getEmailSentAt() { return emailSentAt; }
    public void setEmailSentAt(OffsetDateTime emailSentAt) { this.emailSentAt = emailSentAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}