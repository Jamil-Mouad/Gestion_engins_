package ma.intersig.magasin.api;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.hamcrest.Matchers.*;

class CiterneBaremeApiTest extends ApiTestBase {

    private static final Map<String, Object> BAREME = Map.of("rows", new Object[]{
            Map.of("hauteurCm", 50, "litres", 5000),
            Map.of("hauteurCm", 100, "litres", 11000),
            Map.of("hauteurCm", 150, "litres", 17000),
    });

    private void installBareme() {
        asRole("ADMIN")
                .contentType("application/json").body(BAREME)
                .put("/citerne/bareme")
                .then().statusCode(200).body("size()", is(3));
    }

    @Test
    void conversion_exactRow_returnsBaremeValue() {
        installBareme();
        asRole("MAGASIN")
                .get("/citerne/conversion?hauteurCm=100")
                .then().statusCode(200)
                .body("litres", is(11000.0f))
                .body("tonnes", is(9.295f));
    }

    @Test
    void conversion_betweenRows_interpolatesLinearly() {
        installBareme();
        // 125 cm → halfway between 11 000 and 17 000 = 14 000 L
        asRole("MAGASIN")
                .get("/citerne/conversion?hauteurCm=125")
                .then().statusCode(200)
                .body("litres", is(14000.0f));
    }

    @Test
    void conversion_belowFirstRow_interpolatesFromZero() {
        installBareme();
        // 25 cm → between (0, 0) and (50, 5000) = 2 500 L
        asRole("MAGASIN")
                .get("/citerne/conversion?hauteurCm=25")
                .then().statusCode(200)
                .body("litres", is(2500.0f));
    }

    @Test
    void conversion_aboveLastRow_rejected() {
        installBareme();
        asRole("MAGASIN")
                .get("/citerne/conversion?hauteurCm=180")
                .then().statusCode(400)
                .body("code", is("BAREME_HAUTEUR_HORS_PLAGE"));
    }

    @Test
    void conversion_withoutBareme_conflict() {
        asRole("MAGASIN")
                .get("/citerne/conversion?hauteurCm=100")
                .then().statusCode(409)
                .body("code", is("BAREME_EMPTY"));
    }

    @Test
    void bareme_duplicateHeights_rejected() {
        asRole("ADMIN")
                .contentType("application/json")
                .body(Map.of("rows", new Object[]{
                        Map.of("hauteurCm", 50, "litres", 5000),
                        Map.of("hauteurCm", 50.0, "litres", 5100),
                }))
                .put("/citerne/bareme")
                .then().statusCode(400)
                .body("code", is("BAREME_DUPLICATE_HAUTEUR"));
    }

    @Test
    void baremeWrite_allowedForMagasin_deniedForFleetManager() {
        asRole("MAGASIN")
                .contentType("application/json").body(BAREME)
                .put("/citerne/bareme")
                .then().statusCode(200).body("size()", is(3));
        asRole("FLEET_MANAGER")
                .contentType("application/json").body(BAREME)
                .put("/citerne/bareme")
                .then().statusCode(403);
    }

    @Test
    void citerneUpdate_asMagasin_allowed_deniedForFleetManager() {
        Map<String, Object> body = Map.of(
                "nom", "Citerne magasin",
                "capaciteLitres", 22000,
                "densiteKgParLitre", 0.845,
                "hauteurMaxCm", 220,
                "stockInitialLitres", 500,
                "stockInitialDate", "2025-01-01");
        asRole("MAGASIN")
                .contentType("application/json").body(body)
                .put("/citerne")
                .then().statusCode(200)
                .body("capaciteLitres", is(22000));
        asRole("FLEET_MANAGER")
                .contentType("application/json").body(body)
                .put("/citerne")
                .then().statusCode(403);
    }

    @Test
    void citerneRead_allowedForFleetManager_deniedForUser() {
        asRole("FLEET_MANAGER").get("/citerne").then().statusCode(200)
                .body("capaciteLitres", notNullValue());
        asRole("USER").get("/citerne").then().statusCode(403);
    }

    @Test
    void citerneUpdate_asAdmin_persists() {
        asRole("ADMIN")
                .contentType("application/json")
                .body(Map.of(
                        "nom", "Citerne principale",
                        "capaciteLitres", 25000,
                        "densiteKgParLitre", 0.84,
                        "hauteurMaxCm", 250,
                        "stockInitialLitres", 1000,
                        "stockInitialDate", "2025-01-01"))
                .put("/citerne")
                .then().statusCode(200)
                .body("capaciteLitres", is(25000))
                .body("nom", is("Citerne principale"));
    }
}
