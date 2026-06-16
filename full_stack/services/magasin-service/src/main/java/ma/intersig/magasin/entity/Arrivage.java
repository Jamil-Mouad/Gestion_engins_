package ma.intersig.magasin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "arrivage")
public class Arrivage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "citerne_id", nullable = false)
    private Long citerneId;

    @Column(name = "date_arrivage", nullable = false)
    private LocalDate dateArrivage;

    @Column(name = "numero_bl", length = 40)
    private String numeroBl;

    @Column(name = "quantite_litres", nullable = false)
    private BigDecimal quantiteLitres;

    @Column(name = "prix_unitaire_ht")
    private BigDecimal prixUnitaireHt;

    @Column(name = "valeur_ht")
    private BigDecimal valeurHt;

    @Column(length = 120)
    private String fournisseur;

    @Column(nullable = false, length = 20)
    private String source = "SAISIE";

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCiterneId() { return citerneId; }
    public void setCiterneId(Long citerneId) { this.citerneId = citerneId; }
    public LocalDate getDateArrivage() { return dateArrivage; }
    public void setDateArrivage(LocalDate dateArrivage) { this.dateArrivage = dateArrivage; }
    public String getNumeroBl() { return numeroBl; }
    public void setNumeroBl(String numeroBl) { this.numeroBl = numeroBl; }
    public BigDecimal getQuantiteLitres() { return quantiteLitres; }
    public void setQuantiteLitres(BigDecimal quantiteLitres) { this.quantiteLitres = quantiteLitres; }
    public BigDecimal getPrixUnitaireHt() { return prixUnitaireHt; }
    public void setPrixUnitaireHt(BigDecimal prixUnitaireHt) { this.prixUnitaireHt = prixUnitaireHt; }
    public BigDecimal getValeurHt() { return valeurHt; }
    public void setValeurHt(BigDecimal valeurHt) { this.valeurHt = valeurHt; }
    public String getFournisseur() { return fournisseur; }
    public void setFournisseur(String fournisseur) { this.fournisseur = fournisseur; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
