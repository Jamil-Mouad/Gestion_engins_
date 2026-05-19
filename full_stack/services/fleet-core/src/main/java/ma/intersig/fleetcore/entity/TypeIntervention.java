package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "types_intervention")
public class TypeIntervention {

    @Id
    @Column(columnDefinition = "SMALLINT")
    private Short id;

    @Column(nullable = false, length = 60)
    private String libelle;

    public Short getId() { return id; }
    public void setId(Short id) { this.id = id; }
    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
}