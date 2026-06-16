package ma.intersig.magasin.api;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.is;

class SortieSearchApiTest extends ApiTestBase {

    private void createSortie(String date, String destination, String vehiculeCode, String demandeur) {
        Map<String, Object> body = new HashMap<>();
        body.put("dateSortie", date);
        body.put("quantiteLitres", 100);
        body.put("typeMouvement", "SORTIE");
        body.put("destination", destination);
        if (vehiculeCode != null) body.put("vehiculeCode", vehiculeCode);
        if (demandeur != null) body.put("demandeur", demandeur);
        asRole("MAGASIN")
                .contentType("application/json").body(body)
                .post("/sorties")
                .then().statusCode(201);
    }

    @Test
    void search_matchesVehiculeCode_caseInsensitivePartial() {
        createSortie("2025-03-01", "CHANTIER NORD", "D31", "ALAMI");
        createSortie("2025-03-02", "DEPOT SUD", "CAM-409", "BENNANI");

        asRole("MAGASIN")
                .get("/sorties?search=d31")
                .then().statusCode(200)
                .body("totalElements", is(1))
                .body("content[0].vehiculeCode", is("D31"));

        asRole("MAGASIN")
                .get("/sorties?search=409")
                .then().statusCode(200)
                .body("totalElements", is(1))
                .body("content[0].vehiculeCode", is("CAM-409"));
    }

    @Test
    void search_stillMatchesDestinationAndDemandeur() {
        createSortie("2025-03-01", "CHANTIER NORD", "D31", "ALAMI");
        createSortie("2025-03-02", "DEPOT SUD", null, "BENNANI");

        asRole("MAGASIN")
                .get("/sorties?search=chantier")
                .then().statusCode(200)
                .body("totalElements", is(1));

        asRole("MAGASIN")
                .get("/sorties?search=bennani")
                .then().statusCode(200)
                .body("totalElements", is(1));
    }

    @Test
    void list_withoutSearch_andDateFilters_safe() {
        // Guards the lower(bytea) JPQL null-param gotcha: no search + date range must not 500.
        createSortie("2025-03-01", "CHANTIER NORD", "D31", null);
        createSortie("2025-04-01", "DEPOT SUD", null, null);

        asRole("MAGASIN")
                .get("/sorties?dateMin=2025-03-01&dateMax=2025-03-31")
                .then().statusCode(200)
                .body("totalElements", is(1));

        asRole("MAGASIN")
                .get("/sorties")
                .then().statusCode(200)
                .body("totalElements", is(2));
    }
}
