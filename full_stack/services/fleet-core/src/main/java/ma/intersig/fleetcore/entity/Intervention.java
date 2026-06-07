package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "interventions")
public class Intervention {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "type_id")
    private TypeIntervention typeIntervention;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "composant_id")
    private Composant composant;

    @Column(nullable = false, length = 15)
    private String categorie;

    @Column(length = 60)
    private String partie;

    @Column(name = "n_bs", length = 30)
    private String nBs;

    @Column(name = "date_debut", nullable = false)
    private OffsetDateTime dateDebut;

    @Column(name = "date_fin")
    private OffsetDateTime dateFin;

    @Column(name = "temps_heures", precision = 6, scale = 2)
    private BigDecimal tempsHeures;

    @Column(name = "cout_pieces", precision = 10, scale = 2)
    private BigDecimal coutPieces;

    @Column(name = "cout_main_oeuvre", precision = 10, scale = 2)
    private BigDecimal coutMainOeuvre;

    @Column(name = "cout_sous_traitance", precision = 10, scale = 2)
    private BigDecimal coutSousTraitance;

    @Column(name = "cout_total", insertable = false, updatable = false, precision = 10, scale = 2)
    private BigDecimal coutTotal;

    private String observations;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "demande_achat_id")
    private DemandeAchat demandeAchat;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }
    public TypeIntervention getTypeIntervention() { return typeIntervention; }
    public void setTypeIntervention(TypeIntervention typeIntervention) { this.typeIntervention = typeIntervention; }
    public Composant getComposant() { return composant; }
    public void setComposant(Composant composant) { this.composant = composant; }
    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }
    public String getPartie() { return partie; }
    public void setPartie(String partie) { this.partie = partie; }
    public String getNBs() { return nBs; }
    public void setNBs(String nBs) { this.nBs = nBs; }
    public OffsetDateTime getDateDebut() { return dateDebut; }
    public void setDateDebut(OffsetDateTime dateDebut) { this.dateDebut = dateDebut; }
    public OffsetDateTime getDateFin() { return dateFin; }
    public void setDateFin(OffsetDateTime dateFin) { this.dateFin = dateFin; }
    public BigDecimal getTempsHeures() { return tempsHeures; }
    public void setTempsHeures(BigDecimal tempsHeures) { this.tempsHeures = tempsHeures; }
    public BigDecimal getCoutPieces() { return coutPieces; }
    public void setCoutPieces(BigDecimal coutPieces) { this.coutPieces = coutPieces; }
    public BigDecimal getCoutMainOeuvre() { return coutMainOeuvre; }
    public void setCoutMainOeuvre(BigDecimal coutMainOeuvre) { this.coutMainOeuvre = coutMainOeuvre; }
    public BigDecimal getCoutSousTraitance() { return coutSousTraitance; }
    public void setCoutSousTraitance(BigDecimal coutSousTraitance) { this.coutSousTraitance = coutSousTraitance; }
    public BigDecimal getCoutTotal() { return coutTotal; }
    public String getObservations() { return observations; }
    public void setObservations(String observations) { this.observations = observations; }
    public DemandeAchat getDemandeAchat() { return demandeAchat; }
    public void setDemandeAchat(DemandeAchat demandeAchat) { this.demandeAchat = demandeAchat; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}