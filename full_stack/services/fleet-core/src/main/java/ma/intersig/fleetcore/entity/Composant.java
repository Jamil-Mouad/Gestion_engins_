package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "composants")
public class Composant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Composant parent;

    // NULL = template node (per-type starter tree); a value makes the node
    // part of that vehicle's own composant tree (V123).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    @Column(nullable = false, columnDefinition = "SMALLINT")
    private Short niveau;

    // unique per (vehicule_id, reference) — see V123
    @Column(length = 40)
    private String reference;

    @Column(nullable = false, length = 120)
    private String designation;

    @Column(length = 40)
    private String categorie;

    private String unite;

    private String marque;

    @Column(name = "prix_unitaire", precision = 10, scale = 2)
    private BigDecimal prixUnitaire;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    // NULL = shared baseline (visible for all types); a value scopes the node to that vehicle type.
    @Column(name = "vehicule_type", length = 30)
    private String vehiculeType;

    @Column(columnDefinition = "INTEGER DEFAULT 0")
    private Integer stock;

    @Column(nullable = false)
    private Boolean actif = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cree_par")
    private User creePar;

    // No cascade: ComposantService.delete() enforces the guard (COMPOSANT_IN_USE) at service layer.
    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    private java.util.List<Composant> children;

    @Column(name = "created_at", insertable = false, updatable = false)
    private java.time.OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private java.time.OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Composant getParent() { return parent; }
    public void setParent(Composant parent) { this.parent = parent; }
    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }
    public Short getNiveau() { return niveau; }
    public void setNiveau(Short niveau) { this.niveau = niveau; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }
    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }
    public String getUnite() { return unite; }
    public void setUnite(String unite) { this.unite = unite; }
    public String getMarque() { return marque; }
    public void setMarque(String marque) { this.marque = marque; }
    public BigDecimal getPrixUnitaire() { return prixUnitaire; }
    public void setPrixUnitaire(BigDecimal prixUnitaire) { this.prixUnitaire = prixUnitaire; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getVehiculeType() { return vehiculeType; }
    public void setVehiculeType(String vehiculeType) { this.vehiculeType = vehiculeType; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
    public User getCreePar() { return creePar; }
    public void setCreePar(User creePar) { this.creePar = creePar; }
    public java.util.List<Composant> getChildren() { return children; }
    public void setChildren(java.util.List<Composant> children) { this.children = children; }
    public java.time.OffsetDateTime getCreatedAt() { return createdAt; }
    public java.time.OffsetDateTime getUpdatedAt() { return updatedAt; }
}