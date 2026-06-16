package ma.intersig.fleetcore.unit;

import ma.intersig.fleetcore.repository.*;
import ma.intersig.fleetcore.service.ExportService;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.mockito.Mockito.mock;

class ExportServiceTest {

    private final ExportService service = new ExportService(
            mock(VehiculeRepository.class),
            mock(InterventionRepository.class),
            mock(PneuRepository.class),
            mock(SuiviVidangeRepository.class),
            mock(ReleveCompteurRepository.class),
            mock(ComposantRepository.class),
            mock(DemandeAchatRepository.class),
            mock(TracteurSemiAssignmentRepository.class)
    );

    @Test
    void exportExcel_null_entites_throwsIllegalArgumentException() throws IOException {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> service.exportExcel(null, null));
    }
}
