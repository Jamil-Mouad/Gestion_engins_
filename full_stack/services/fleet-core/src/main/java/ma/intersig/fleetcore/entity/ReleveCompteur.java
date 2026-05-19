package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "releves_compteur")
public class ReleveCompteur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    @Column(name = "date_releve", nullable = false)
    private OffsetDateTime dateReleve;

    @Column(name = "compteur_km")
    private Integer compteurKm;

    @Column(name = "compteur_heures")
    private Integer compteurHeures;

    @Column(nullable = false, length = 20)
    private String source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_id")
    private ImportsHistorique importHistorique;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }
    public OffsetDateTime getDateReleve() { return dateReleve; }
    public void setDateReleve(OffsetDateTime dateReleve) { this.dateReleve = dateReleve; }
    public Integer getCompteurKm() { return compteurKm; }
    public void setCompteurKm(Integer compteurKm) { this.compteurKm = compteurKm; }
    public Integer getCompteurHeures() { return compteurHeures; }
    public void setCompteurHeures(Integer compteurHeures) { this.compteurHeures = compteurHeures; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public ImportsHistorique getImportHistorique() { return importHistorique; }
    public void setImportHistorique(ImportsHistorique importHistorique) { this.importHistorique = importHistorique; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}