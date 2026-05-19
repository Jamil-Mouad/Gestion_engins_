package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.SuiviVidange;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SuiviVidangeRepository extends JpaRepository<SuiviVidange, Long> {

    List<SuiviVidange> findByVehiculeId(Long vehiculeId);

    List<SuiviVidange> findByVehiculeIdAndStatut(Long vehiculeId, String statut);

    Page<SuiviVidange> findByStatut(String statut, Pageable pageable);

    List<SuiviVidange> findByStatut(String statut);

    List<SuiviVidange> findByStatutIn(List<String> statuts);

    @Query("SELECT sv FROM SuiviVidange sv LEFT JOIN FETCH sv.vehicule")
    List<SuiviVidange> findAllWithVehicule();

    @Query("SELECT sv FROM SuiviVidange sv LEFT JOIN FETCH sv.vehicule WHERE sv.statut = :statut")
    List<SuiviVidange> findByStatutWithVehicule(@org.springframework.data.repository.query.Param("statut") String statut);

    @Query("SELECT sv FROM SuiviVidange sv WHERE sv.statut IN :statuts AND sv.prochainEntretienEstime IS NOT NULL AND sv.prochainEntretienEstime BETWEEN :from AND :to")
    List<SuiviVidange> findByStatutInAndProchainEntretienEstimeBetween(
            @org.springframework.data.repository.query.Param("statuts") List<String> statuts,
            @org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDate to);
}