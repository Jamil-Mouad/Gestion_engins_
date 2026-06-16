package ma.intersig.magasin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * Read-only view of the shared {@code vehicules} table (owned by fleet-core).
 * Magasin-service never writes to it — it only resolves fuel-log codes and
 * reads identity/odometer fields for KPI labelling.
 */
@Entity
@Immutable
@Table(name = "vehicules")
public class VehiculeRef {

    @Id
    private Long id;

    @Column
    private String code;

    @Column
    private String type;

    @Column
    private String marque;

    @Column
    private String modele;

    @Column
    private String matricule;

    @Column(name = "compteur_km")
    private Integer compteurKm;

    @Column
    private Boolean actif;

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getType() { return type; }
    public String getMarque() { return marque; }
    public String getModele() { return modele; }
    public String getMatricule() { return matricule; }
    public Integer getCompteurKm() { return compteurKm; }
    public Boolean getActif() { return actif; }
}
