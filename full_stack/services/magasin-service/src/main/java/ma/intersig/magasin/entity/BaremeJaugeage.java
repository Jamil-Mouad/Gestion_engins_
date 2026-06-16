package ma.intersig.magasin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "bareme_jaugeage")
public class BaremeJaugeage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "citerne_id", nullable = false)
    private Long citerneId;

    @Column(name = "hauteur_cm", nullable = false)
    private BigDecimal hauteurCm;

    @Column(nullable = false)
    private BigDecimal litres;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCiterneId() { return citerneId; }
    public void setCiterneId(Long citerneId) { this.citerneId = citerneId; }
    public BigDecimal getHauteurCm() { return hauteurCm; }
    public void setHauteurCm(BigDecimal hauteurCm) { this.hauteurCm = hauteurCm; }
    public BigDecimal getLitres() { return litres; }
    public void setLitres(BigDecimal litres) { this.litres = litres; }
}
