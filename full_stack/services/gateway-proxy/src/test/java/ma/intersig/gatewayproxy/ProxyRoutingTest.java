package ma.intersig.gatewayproxy;

import ma.intersig.gatewayproxy.util.TestTokenHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.contract.wiremock.AutoConfigureWireMock;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.cloud.gateway.routes[0].id=fleet-core",
                "spring.cloud.gateway.routes[0].uri=http://localhost:${wiremock.server.port}",
                "spring.cloud.gateway.routes[0].predicates[0]=Path=/api/v1/**",
                "spring.cloud.gateway.routes[1].id=gateway-auth",
                "spring.cloud.gateway.routes[1].uri=http://localhost:${wiremock.server.port}",
                "spring.cloud.gateway.routes[1].predicates[0]=Path=/api/auth/**",
                "app.jwt.secret=" + TestTokenHelper.SECRET
        }
)
@AutoConfigureWireMock(port = 0)
class ProxyRoutingTest {

    @Autowired
    WebTestClient client;

    @Test
    void unauthenticated_request_to_protected_route_returns401() {
        client.get().uri("/api/v1/vehicules")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void authenticated_request_injects_userId_header() {
        stubFor(get(urlPathEqualTo("/api/v1/vehicules"))
                .withHeader("X-Authenticated-User-Id", equalTo("42"))
                .willReturn(ok("[]")));

        client.get().uri("/api/v1/vehicules")
                .header("Authorization", "Bearer " + TestTokenHelper.generateToken(42L))
                .exchange()
                .expectStatus().isOk();

        verify(getRequestedFor(urlPathEqualTo("/api/v1/vehicules"))
                .withHeader("X-Authenticated-User-Id", equalTo("42")));
    }

    @Test
    void authenticated_request_injects_roles_header() {
        stubFor(get(urlPathEqualTo("/api/v1/vehicules"))
                .willReturn(ok("[]")));

        client.get().uri("/api/v1/vehicules")
                .header("Authorization", "Bearer " + TestTokenHelper.generateToken(1L, "FLEET_MANAGER"))
                .exchange()
                .expectStatus().isOk();

        verify(getRequestedFor(urlPathEqualTo("/api/v1/vehicules"))
                .withHeader("X-Authenticated-User-Roles", containing("FLEET_MANAGER")));
    }

    @Test
    void spoofed_userId_header_is_stripped_and_replaced() {
        stubFor(get(urlPathEqualTo("/api/v1/vehicules"))
                .withHeader("X-Authenticated-User-Id", equalTo("7"))
                .willReturn(ok("[]")));

        client.get().uri("/api/v1/vehicules")
                .header("Authorization", "Bearer " + TestTokenHelper.generateToken(7L))
                .header("X-Authenticated-User-Id", "999")
                .exchange()
                .expectStatus().isOk();

        // Stub only matched if header was exactly "7" — proves spoofed "999" was replaced
        verify(getRequestedFor(urlPathEqualTo("/api/v1/vehicules"))
                .withHeader("X-Authenticated-User-Id", equalTo("7")));
    }

    @Test
    void auth_route_is_permit_all_without_bearer_token() {
        stubFor(post(urlPathEqualTo("/api/auth/login"))
                .willReturn(ok("{\"token\":\"abc\"}")));

        client.post().uri("/api/auth/login")
                .exchange()
                .expectStatus().isOk();
    }
}
