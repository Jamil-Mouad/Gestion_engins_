package ma.intersig.magasin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "citerne")
public class Citerne {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String nom;

    @Column(name = "capacite_litres", nullable = false)
    private BigDecimal capaciteLitres;

    @Column(name = "densite_kg_par_litre", nullable = false)
    private BigDecimal densiteKgParLitre;

    @Column(name = "hauteur_max_cm")
    private BigDecimal hauteurMaxCm;

    @Column(name = "stock_initial_litres", nullable = false)
    private BigDecimal stockInitialLitres;

    @Column(name = "stock_initial_date", nullable = false)
    private LocalDate stockInitialDate;

    @Column(nullable = false)
    private Boolean actif = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public BigDecimal getCapaciteLitres() { return capaciteLitres; }
    public void setCapaciteLitres(BigDecimal capaciteLitres) { this.capaciteLitres = capaciteLitres; }
    public BigDecimal getDensiteKgParLitre() { return densiteKgParLitre; }
    public void setDensiteKgParLitre(BigDecimal densiteKgParLitre) { this.densiteKgParLitre = densiteKgParLitre; }
    public BigDecimal getHauteurMaxCm() { return hauteurMaxCm; }
    public void setHauteurMaxCm(BigDecimal hauteurMaxCm) { this.hauteurMaxCm = hauteurMaxCm; }
    public BigDecimal getStockInitialLitres() { return stockInitialLitres; }
    public void setStockInitialLitres(BigDecimal stockInitialLitres) { this.stockInitialLitres = stockInitialLitres; }
    public LocalDate getStockInitialDate() { return stockInitialDate; }
    public void setStockInitialDate(LocalDate stockInitialDate) { this.stockInitialDate = stockInitialDate; }
    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
