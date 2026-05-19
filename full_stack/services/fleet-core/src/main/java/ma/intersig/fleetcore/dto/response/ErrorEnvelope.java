package ma.intersig.fleetcore.dto.response;

import java.util.List;
import java.util.Map;

public record ErrorEnvelope(
        String error,
        String code,
        Map<String, List<String>> details
) {
}