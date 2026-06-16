package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "demandes_achat")
public class DemandeAchat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 20)
    private String code;

    @Column(name = "date_demande", nullable = false)
    private OffsetDateTime dateDemande;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "demandeur_id")
    private User demandeur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "composant_id")
    private Composant composant;

    @Column(name = "piece_libre", length = 120)
    private String pieceLibre;

    @Column(length = 40)
    private String reference;

    @Column(nullable = false)
    private Integer quantite = 1;

    private String motif;

    @Column(length = 10)
    private String urgence;

    @Column(nullable = false, length = 15)
    private String statut;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approbateur_id")
    private User approbateur;

    @Column(name = "date_approbation")
    private OffsetDateTime dateApprobation;

    @Column(name = "raison_rejet")
    private String raisonRejet;

    @Column(name = "bon_commande_url")
    private String bonCommandeUrl;

    /** Free-text worker name (the person who actually requests the purchase, separate from the logged-in admin). */
    @Column(name = "demandeur_nom", length = 150)
    private String demandeurNom;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public OffsetDateTime getDateDemande() { return dateDemande; }
    public void setDateDemande(OffsetDateTime dateDemande) { this.dateDemande = dateDemande; }
    public User getDemandeur() { return demandeur; }
    public void setDemandeur(User demandeur) { this.demandeur = demandeur; }
    public Composant getComposant() { return composant; }
    public void setComposant(Composant composant) { this.composant = composant; }
    public String getPieceLibre() { return pieceLibre; }
    public void setPieceLibre(String pieceLibre) { this.pieceLibre = pieceLibre; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public Integer getQuantite() { return quantite; }
    public void setQuantite(Integer quantite) { this.quantite = quantite; }
    public String getMotif() { return motif; }
    public void setMotif(String motif) { this.motif = motif; }
    public String getUrgence() { return urgence; }
    public void setUrgence(String urgence) { this.urgence = urgence; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public User getApprobateur() { return approbateur; }
    public void setApprobateur(User approbateur) { this.approbateur = approbateur; }
    public OffsetDateTime getDateApprobation() { return dateApprobation; }
    public void setDateApprobation(OffsetDateTime dateApprobation) { this.dateApprobation = dateApprobation; }
    public String getRaisonRejet() { return raisonRejet; }
    public void setRaisonRejet(String raisonRejet) { this.raisonRejet = raisonRejet; }
    public String getBonCommandeUrl() { return bonCommandeUrl; }
    public void setBonCommandeUrl(String bonCommandeUrl) { this.bonCommandeUrl = bonCommandeUrl; }
    public String getDemandeurNom() { return demandeurNom; }
    public void setDemandeurNom(String demandeurNom) { this.demandeurNom = demandeurNom; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}