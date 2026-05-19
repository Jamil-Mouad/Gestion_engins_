package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "imports_historique")
public class ImportsHistorique {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 255)
    private String fichier;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(name = "lignes_total")
    private Integer lignesTotal;

    @Column(name = "lignes_ok")
    private Integer lignesOk;

    @Column(name = "lignes_erreur")
    private Integer lignesErreur;

    @Column(name = "rapport_url")
    private String rapportUrl;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getFichier() { return fichier; }
    public void setFichier(String fichier) { this.fichier = fichier; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Integer getLignesTotal() { return lignesTotal; }
    public void setLignesTotal(Integer lignesTotal) { this.lignesTotal = lignesTotal; }
    public Integer getLignesOk() { return lignesOk; }
    public void setLignesOk(Integer lignesOk) { this.lignesOk = lignesOk; }
    public Integer getLignesErreur() { return lignesErreur; }
    public void setLignesErreur(Integer lignesErreur) { this.lignesErreur = lignesErreur; }
    public String getRapportUrl() { return rapportUrl; }
    public void setRapportUrl(String rapportUrl) { this.rapportUrl = rapportUrl; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}