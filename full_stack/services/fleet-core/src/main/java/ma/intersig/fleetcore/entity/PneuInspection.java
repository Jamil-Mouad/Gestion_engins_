package ma.intersig.fleetcore.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "pneu_inspections")
public class PneuInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pneu_id")
    private Pneu pneu;

    @Column(name = "date_inspection", nullable = false)
    private OffsetDateTime dateInspection;

    @Column(name = "tire_meter")
    private Integer tireMeter;

    @Column(nullable = false, length = 30)
    private String activity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "pression_psi", precision = 4, scale = 1)
    private BigDecimal pressionPsi;

    @Column(name = "profondeur_32e", columnDefinition = "SMALLINT")
    private Short profondeur32e;

    @Column(length = 20)
    private String methode;

    private String notes;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Pneu getPneu() { return pneu; }
    public void setPneu(Pneu pneu) { this.pneu = pneu; }
    public OffsetDateTime getDateInspection() { return dateInspection; }
    public void setDateInspection(OffsetDateTime dateInspection) { this.dateInspection = dateInspection; }
    public Integer getTireMeter() { return tireMeter; }
    public void setTireMeter(Integer tireMeter) { this.tireMeter = tireMeter; }
    public String getActivity() { return activity; }
    public void setActivity(String activity) { this.activity = activity; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public BigDecimal getPressionPsi() { return pressionPsi; }
    public void setPressionPsi(BigDecimal pressionPsi) { this.pressionPsi = pressionPsi; }
    public Short getProfondeur32e() { return profondeur32e; }
    public void setProfondeur32e(Short profondeur32e) { this.profondeur32e = profondeur32e; }
    public String getMethode() { return methode; }
    public void setMethode(String methode) { this.methode = methode; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}