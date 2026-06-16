package ma.intersig.magasin.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.OffsetDateTime;

/**
 * Thin internal HTTP client to fleet-core (which owns {@code releves_compteur} / {@code pneus}).
 *
 * <p>Recording a counter reading there fires the {@code process_releve} DB trigger, advancing the
 * vehicle's tyre km, and fleet-core then raises any {@code seuil_pneu} alert in real time. Failures
 * are swallowed (logged) so a fuel sortie is never blocked by fleet-core being down or rejecting a
 * regressing counter.
 */
@Component
public class FleetCoreClient {

    private static final Logger log = LoggerFactory.getLogger(FleetCoreClient.class);

    private final RestClient restClient;

    public FleetCoreClient(@Value("${app.fleet-core.base-url:http://127.0.0.1:8081}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    /**
     * POST a single odometer reading to fleet-core. The proxy auth headers are forwarded so
     * fleet-core's {@code @PreAuthorize} accepts the call on behalf of the magasin user.
     */
    public void recordReleve(Long vehiculeId, Integer compteurKm, OffsetDateTime dateReleve,
                             String authUserId, String authRoles) {
        if (vehiculeId == null || compteurKm == null) return;
        try {
            restClient.post()
                    .uri("/api/v1/releves")
                    .headers(h -> {
                        if (authUserId != null) h.set("X-Authenticated-User-Id", authUserId);
                        if (authRoles != null) h.set("X-Authenticated-User-Roles", authRoles);
                    })
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new ReleveBody(vehiculeId, dateReleve, compteurKm, null))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            // 4xx (e.g. counter regression) is expected and non-fatal for the sortie
            log.warn("Relevé push to fleet-core rejected for vehicule {} ({}): {}",
                    vehiculeId, e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.warn("Relevé push to fleet-core failed for vehicule {}: {}", vehiculeId, e.getMessage());
        }
    }

    /** Mirrors fleet-core's {@code CreateReleveRequest} JSON shape. */
    private record ReleveBody(Long vehiculeId, OffsetDateTime dateReleve,
                              Integer compteurKm, Integer compteurHeures) {}
}
