package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.response.TableauJourneesDto;
import ma.intersig.fleetcore.entity.Camion;
import ma.intersig.fleetcore.entity.Vehicule;
import ma.intersig.fleetcore.repository.VehiculeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class TableauJourneesService {

    private final VehiculeRepository vehiculeRepository;

    public TableauJourneesService(VehiculeRepository vehiculeRepository) {
        this.vehiculeRepository = vehiculeRepository;
    }

    public TableauJourneesDto get(LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }

        List<Vehicule> vehicules = vehiculeRepository.findAllActive();

        List<TableauJourneesDto.VehiculeStatusDto> vehiculeDtos = new ArrayList<>();
        int enService = 0;
        int workshop = 0;
        int maintenance = 0;
        int horsService = 0;

        for (Vehicule v : vehicules) {
            String chauffeurNom = null;
            if (v instanceof Camion c) {
                String prenom = c.getChauffeurPrenom();
                String nom = c.getChauffeurNom();
                if (prenom != null && nom != null) {
                    chauffeurNom = nom + " " + prenom;
                } else if (nom != null) {
                    chauffeurNom = nom;
                } else if (prenom != null) {
                    chauffeurNom = prenom;
                }
            }

            vehiculeDtos.add(new TableauJourneesDto.VehiculeStatusDto(
                    v.getId(),
                    v.getCode(),
                    v.getMatricule(),
                    v.getType(),
                    v.getStatut(),
                    chauffeurNom
            ));

            switch (v.getStatut()) {
                case "in-service" -> enService++;
                case "workshop" -> workshop++;
                case "maintenance" -> maintenance++;
                case "out-of-service" -> horsService++;
                default -> {}
            }
        }

        int total = vehiculeDtos.size();
        TableauJourneesDto.StatsDto stats = new TableauJourneesDto.StatsDto(
                total, enService, workshop, maintenance, horsService
        );

        return new TableauJourneesDto(date, vehiculeDtos, stats);
    }
}