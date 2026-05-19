package ma.intersig.gatewayproxy.config;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
public class IdentityPropagationFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return exchange.getPrincipal()
                .cast(JwtAuthenticationToken.class)
                .flatMap(auth -> {
                    String userId = auth.getToken().getSubject();
                    List<String> roles = auth.getToken().getClaimAsStringList("roles");

                    ServerHttpRequest mutated = exchange.getRequest().mutate()
                            .headers(headers -> {
                                headers.remove("X-Authenticated-User-Id");
                                headers.remove("X-Authenticated-User-Roles");
                                headers.set("X-Authenticated-User-Id", userId);
                                if (roles != null && !roles.isEmpty()) {
                                    headers.set("X-Authenticated-User-Roles", String.join(",", roles));
                                }
                            })
                            .build();

                    return chain.filter(exchange.mutate().request(mutated).build());
                })
                .switchIfEmpty(Mono.defer(() -> {
                    // permitAll routes (e.g. /api/auth/**): strip spoofed headers, don't inject
                    ServerHttpRequest cleaned = exchange.getRequest().mutate()
                            .headers(headers -> {
                                headers.remove("X-Authenticated-User-Id");
                                headers.remove("X-Authenticated-User-Roles");
                            })
                            .build();
                    return chain.filter(exchange.mutate().request(cleaned).build());
                }));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
