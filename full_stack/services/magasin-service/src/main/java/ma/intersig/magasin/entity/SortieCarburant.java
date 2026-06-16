package ma.intersig.magasin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "sortie_carburant")
public class SortieCarburant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "citerne_id", nullable = false)
    private Long citerneId;

    @Column(name = "date_sortie", nullable = false)
    private LocalDate dateSortie;

    @Column
    private BigDecimal totaliseur;

    @Column(name = "quantite_litres", nullable = false)
    private BigDecimal quantiteLitres;

    @Column(name = "type_mouvement", nullable = false, length = 20)
    private String typeMouvement = "SORTIE";

    @Column(nullable = false, length = 120)
    private String destination;

    @Column(name = "vehicule_id")
    private Long vehiculeId;

    @Column(name = "vehicule_code", length = 20)
    private String vehiculeCode;

    @Column(nullable = false)
    private Boolean tiers = false;

    @Column
    private BigDecimal compteur;

    @Column(length = 120)
    private String demandeur;

    @Column(name = "numero_bs", length = 40)
    private String numeroBs;

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
    public LocalDate getDateSortie() { return dateSortie; }
    public void setDateSortie(LocalDate dateSortie) { this.dateSortie = dateSortie; }
    public BigDecimal getTotaliseur() { return totaliseur; }
    public void setTotaliseur(BigDecimal totaliseur) { this.totaliseur = totaliseur; }
    public BigDecimal getQuantiteLitres() { return quantiteLitres; }
    public void setQuantiteLitres(BigDecimal quantiteLitres) { this.quantiteLitres = quantiteLitres; }
    public String getTypeMouvement() { return typeMouvement; }
    public void setTypeMouvement(String typeMouvement) { this.typeMouvement = typeMouvement; }
    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }
    public Long getVehiculeId() { return vehiculeId; }
    public void setVehiculeId(Long vehiculeId) { this.vehiculeId = vehiculeId; }
    public String getVehiculeCode() { return vehiculeCode; }
    public void setVehiculeCode(String vehiculeCode) { this.vehiculeCode = vehiculeCode; }
    public Boolean getTiers() { return tiers; }
    public void setTiers(Boolean tiers) { this.tiers = tiers; }
    public BigDecimal getCompteur() { return compteur; }
    public void setCompteur(BigDecimal compteur) { this.compteur = compteur; }
    public String getDemandeur() { return demandeur; }
    public void setDemandeur(String demandeur) { this.demandeur = demandeur; }
    public String getNumeroBs() { return numeroBs; }
    public void setNumeroBs(String numeroBs) { this.numeroBs = numeroBs; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
