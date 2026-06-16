package ma.intersig.magasin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "jaugeage")
public class Jaugeage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "citerne_id", nullable = false)
    private Long citerneId;

    @Column(name = "date_jaugeage", nullable = false)
    private LocalDate dateJaugeage;

    @Column(name = "hauteur_cm", nullable = false)
    private BigDecimal hauteurCm;

    @Column(name = "litres_mesures", nullable = false)
    private BigDecimal litresMesures;

    @Column(name = "litres_theoriques")
    private BigDecimal litresTheoriques;

    @Column(name = "ecart_litres")
    private BigDecimal ecartLitres;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCiterneId() { return citerneId; }
    public void setCiterneId(Long citerneId) { this.citerneId = citerneId; }
    public LocalDate getDateJaugeage() { return dateJaugeage; }
    public void setDateJaugeage(LocalDate dateJaugeage) { this.dateJaugeage = dateJaugeage; }
    public BigDecimal getHauteurCm() { return hauteurCm; }
    public void setHauteurCm(BigDecimal hauteurCm) { this.hauteurCm = hauteurCm; }
    public BigDecimal getLitresMesures() { return litresMesures; }
    public void setLitresMesures(BigDecimal litresMesures) { this.litresMesures = litresMesures; }
    public BigDecimal getLitresTheoriques() { return litresTheoriques; }
    public void setLitresTheoriques(BigDecimal litresTheoriques) { this.litresTheoriques = litresTheoriques; }
    public BigDecimal getEcartLitres() { return ecartLitres; }
    public void setEcartLitres(BigDecimal ecartLitres) { this.ecartLitres = ecartLitres; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
