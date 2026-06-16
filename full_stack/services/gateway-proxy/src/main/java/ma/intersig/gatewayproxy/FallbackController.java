package ma.intersig.gatewayproxy;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import java.util.Map;

@RestController
public class FallbackController {

    // Matches any HTTP method: the AI chat route is a POST, so a GET-only
    // mapping would let a circuit-breaker timeout surface as a raw 504.
    @RequestMapping("/fallback/ai")
    public Mono<ResponseEntity<Map<String, String>>> aiFallback() {
        return Mono.just(ResponseEntity
            .status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(Map.of("error", "Service IA indisponible")));
    }
}
