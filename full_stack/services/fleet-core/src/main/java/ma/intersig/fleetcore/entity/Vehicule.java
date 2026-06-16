package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.DiscriminatorFormula;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "vehicules")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorFormula("CASE WHEN type IN ('camion', 'camion_tracteur') THEN 'camion' ELSE 'non_camion' END")
@DiscriminatorValue("non_camion")
public class Vehicule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // unique per (code, type) — see V121; a tracteur+semi pair shares one code
    @Column(nullable = false, length = 20)
    private String code;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false, length = 60)
    private String marque;

    @Column(nullable = false, length = 60)
    private String modele;

    @Column(unique = true, length = 20)
    private String matricule;

    @Column(unique = true, name = "n_chassis", length = 40)
    private String nChassis;

    @Column(columnDefinition = "SMALLINT")
    private Short annee;

    @Column(length = 20)
    private String carburant;

    @Column(nullable = false, length = 20)
    private String statut;

    @Column(name = "date_mise_service")
    private LocalDate dateMiseService;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "config_axle_semi", length = 20)
    private String configAxleSemi;

    @Column(nullable = false)
    private Boolean actif = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getMarque() { return marque; }
    public void setMarque(String marque) { this.marque = marque; }
    public String getModele() { return modele; }
    public void setModele(String modele) { this.modele = modele; }
    public String getMatricule() { return matricule; }
    public void setMatricule(String matricule) { this.matricule = matricule; }
    public String getNChassis() { return nChassis; }
    public void setNChassis(String nChassis) { this.nChassis = nChassis; }
    public Short getAnnee() { return annee; }
    public void setAnnee(Short annee) { this.annee = annee; }
    public String getCarburant() { return carburant; }
    public void setCarburant(String carburant) { this.carburant = carburant; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public LocalDate getDateMiseService() { return dateMiseService; }
    public void setDateMiseService(LocalDate dateMiseService) { this.dateMiseService = dateMiseService; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public String getConfigAxleSemi() { return configAxleSemi; }
    public void setConfigAxleSemi(String configAxleSemi) { this.configAxleSemi = configAxleSemi; }
    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}