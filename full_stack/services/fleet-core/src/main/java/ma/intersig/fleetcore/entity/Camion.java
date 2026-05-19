package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "camions")
@PrimaryKeyJoinColumn(name = "vehicule_id")
@DiscriminatorValue("camion")
public class Camion extends Vehicule {

    @Column(name = "capacite_tonnes", precision = 6, scale = 2)
    private BigDecimal capaciteTonnes;

    @Column(name = "config_axle", length = 20)
    private String configAxle;

    @Column(name = "visite_tech_tracteur_expiration")
    private LocalDate visiteTechTracteurExpiration;

    @Column(name = "visite_tech_semi_expiration")
    private LocalDate visiteTechSemiExpiration;

    @Column(name = "carnet_circulation_expiration")
    private LocalDate carnetCirculationExpiration;

    @Column(name = "metrologie_expiration")
    private LocalDate metrologieExpiration;

    @Column(name = "extincteur_expiration")
    private LocalDate extincteurExpiration;

    @Column(name = "batterie_modele", length = 60)
    private String batterieModele;

    @Column(name = "batterie_date_achat")
    private LocalDate batterieDateAchat;

    @Column(name = "batterie_date_controle")
    private LocalDate batterieDateControle;

    @Column(name = "conso_gasoil_litres_mois", precision = 8, scale = 2)
    private BigDecimal consoGasoilLitresMois;

    @Column(name = "compteur_km", nullable = false)
    private Integer compteurKm = 0;

    @Column(name = "compteur_heures", nullable = false)
    private Integer compteurHeures = 0;

    @Column(name = "chauffeur_prenom", length = 50)
    private String chauffeurPrenom;

    @Column(name = "chauffeur_nom", length = 50)
    private String chauffeurNom;

    public BigDecimal getCapaciteTonnes() { return capaciteTonnes; }
    public void setCapaciteTonnes(BigDecimal capaciteTonnes) { this.capaciteTonnes = capaciteTonnes; }
    public String getConfigAxle() { return configAxle; }
    public void setConfigAxle(String configAxle) { this.configAxle = configAxle; }
    public LocalDate getVisiteTechTracteurExpiration() { return visiteTechTracteurExpiration; }
    public void setVisiteTechTracteurExpiration(LocalDate date) { this.visiteTechTracteurExpiration = date; }
    public LocalDate getVisiteTechSemiExpiration() { return visiteTechSemiExpiration; }
    public void setVisiteTechSemiExpiration(LocalDate date) { this.visiteTechSemiExpiration = date; }
    public LocalDate getCarnetCirculationExpiration() { return carnetCirculationExpiration; }
    public void setCarnetCirculationExpiration(LocalDate date) { this.carnetCirculationExpiration = date; }
    public LocalDate getMetrologieExpiration() { return metrologieExpiration; }
    public void setMetrologieExpiration(LocalDate date) { this.metrologieExpiration = date; }
    public LocalDate getExtincteurExpiration() { return extincteurExpiration; }
    public void setExtincteurExpiration(LocalDate date) { this.extincteurExpiration = date; }
    public String getBatterieModele() { return batterieModele; }
    public void setBatterieModele(String batterieModele) { this.batterieModele = batterieModele; }
    public LocalDate getBatterieDateAchat() { return batterieDateAchat; }
    public void setBatterieDateAchat(LocalDate date) { this.batterieDateAchat = date; }
    public LocalDate getBatterieDateControle() { return batterieDateControle; }
    public void setBatterieDateControle(LocalDate date) { this.batterieDateControle = date; }
    public BigDecimal getConsoGasoilLitresMois() { return consoGasoilLitresMois; }
    public void setConsoGasoilLitresMois(BigDecimal val) { this.consoGasoilLitresMois = val; }
    public Integer getCompteurKm() { return compteurKm; }
    public void setCompteurKm(Integer compteurKm) { this.compteurKm = compteurKm; }
    public Integer getCompteurHeures() { return compteurHeures; }
    public void setCompteurHeures(Integer compteurHeures) { this.compteurHeures = compteurHeures; }
    public String getChauffeurPrenom() { return chauffeurPrenom; }
    public void setChauffeurPrenom(String chauffeurPrenom) { this.chauffeurPrenom = chauffeurPrenom; }
    public String getChauffeurNom() { return chauffeurNom; }
    public void setChauffeurNom(String chauffeurNom) { this.chauffeurNom = chauffeurNom; }
}