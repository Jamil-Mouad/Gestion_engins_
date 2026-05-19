package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "suivi_vidanges")
public class SuiviVidange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "composant_id")
    private Composant composant;

    @Column(name = "intervalle_nbh", nullable = false)
    private Integer intervalleNbh;

    @Column(name = "compteur_nbh_actuel", nullable = false)
    private Integer compteurNbhActuel;

    @Column(name = "nbh_restant", insertable = false, updatable = false)
    private Integer nbhRestant;

    @Column(name = "date_dernier_entretien")
    private LocalDate dateDernierEntretien;

    @Column(name = "prochain_entretien_estime")
    private LocalDate prochainEntretienEstime;

    @Column(nullable = false, length = 15)
    private String statut;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }
    public Composant getComposant() { return composant; }
    public void setComposant(Composant composant) { this.composant = composant; }
    public Integer getIntervalleNbh() { return intervalleNbh; }
    public void setIntervalleNbh(Integer intervalleNbh) { this.intervalleNbh = intervalleNbh; }
    public Integer getCompteurNbhActuel() { return compteurNbhActuel; }
    public void setCompteurNbhActuel(Integer compteurNbhActuel) { this.compteurNbhActuel = compteurNbhActuel; }
    public Integer getNbhRestant() { return nbhRestant; }
    public LocalDate getDateDernierEntretien() { return dateDernierEntretien; }
    public void setDateDernierEntretien(LocalDate dateDernierEntretien) { this.dateDernierEntretien = dateDernierEntretien; }
    public LocalDate getProchainEntretienEstime() { return prochainEntretienEstime; }
    public void setProchainEntretienEstime(LocalDate prochainEntretienEstime) { this.prochainEntretienEstime = prochainEntretienEstime; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}