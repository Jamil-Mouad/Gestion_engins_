package ma.intersig.magasin.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI magasinOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Magasin API")
                .version("1.0.0")
                .description("INTERSIG FleetTracker — fuel store (citerne, sorties, arrivages, jaugeages)"))
            .addSecurityItem(new SecurityRequirement().addList("BearerAuth"))
            .components(new Components()
                .addSecuritySchemes("BearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("JWT token validated by the Gateway. Magasin-service trusts the X-Authenticated-User-Id header.")));
    }
}
