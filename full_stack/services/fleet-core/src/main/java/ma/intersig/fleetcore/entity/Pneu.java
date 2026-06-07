package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "pneus")
public class Pneu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    @Column(nullable = false, columnDefinition = "SMALLINT")
    private Short position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "composant_id")
    private Composant composant;

    @Column(name = "n_serie", length = 40)
    private String nSerie;

    @Column(length = 40)
    private String marque;

    @Column(name = "date_montage")
    private LocalDate dateMontage;

    @Column(name = "km_montage")
    private Integer kmMontage;

    @Column(name = "km_parcourus", nullable = false)
    private Integer kmParcourus;

    @Column(name = "expected_life_km", nullable = false)
    private Integer expectedLifeKm;

    @Column(name = "km_restant", insertable = false, updatable = false)
    private Integer kmRestant;

    @Column(name = "pression_psi", precision = 4, scale = 1)
    private BigDecimal pressionPsi;

    @Column(name = "profondeur_32e", columnDefinition = "SMALLINT")
    private Short profondeur32e;

    @Column(nullable = false, length = 10)
    private String status;

    @Column(nullable = false)
    private Boolean actif = true;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "created_at", insertable = false, updatable = false)
    private java.time.OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private java.time.OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }
    public Short getPosition() { return position; }
    public void setPosition(Short position) { this.position = position; }
    public Composant getComposant() { return composant; }
    public void setComposant(Composant composant) { this.composant = composant; }
    public String getNSerie() { return nSerie; }
    public void setNSerie(String nSerie) { this.nSerie = nSerie; }
    public String getMarque() { return marque; }
    public void setMarque(String marque) { this.marque = marque; }
    public LocalDate getDateMontage() { return dateMontage; }
    public void setDateMontage(LocalDate dateMontage) { this.dateMontage = dateMontage; }
    public Integer getKmMontage() { return kmMontage; }
    public void setKmMontage(Integer kmMontage) { this.kmMontage = kmMontage; }
    public Integer getKmParcourus() { return kmParcourus; }
    public void setKmParcourus(Integer kmParcourus) { this.kmParcourus = kmParcourus; }
    public Integer getExpectedLifeKm() { return expectedLifeKm; }
    public void setExpectedLifeKm(Integer expectedLifeKm) { this.expectedLifeKm = expectedLifeKm; }
    public Integer getKmRestant() { return kmRestant; }
    public BigDecimal getPressionPsi() { return pressionPsi; }
    public void setPressionPsi(BigDecimal pressionPsi) { this.pressionPsi = pressionPsi; }
    public Short getProfondeur32e() { return profondeur32e; }
    public void setProfondeur32e(Short profondeur32e) { this.profondeur32e = profondeur32e; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
    public java.time.OffsetDateTime getCreatedAt() { return createdAt; }
    public java.time.OffsetDateTime getUpdatedAt() { return updatedAt; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
}