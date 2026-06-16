package ma.intersig.magasin.api;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;

class StockKpiApiTest extends ApiTestBase {

    private void createArrivage(String date, int litres) {
        asRole("MAGASIN")
                .contentType("application/json")
                .body(Map.of("dateArrivage", date, "quantiteLitres", litres, "numeroBl", "BL-1"))
                .post("/arrivages")
                .then().statusCode(201);
    }

    private void createSortie(String date, double litres, String destination,
                              Long vehiculeId, Double compteur) {
        Map<String, Object> body = new HashMap<>();
        body.put("dateSortie", date);
        body.put("quantiteLitres", litres);
        body.put("typeMouvement", "SORTIE");
        body.put("destination", destination);
        if (vehiculeId != null) body.put("vehiculeId", vehiculeId);
        if (compteur != null) body.put("compteur", compteur);
        asRole("MAGASIN")
                .contentType("application/json").body(body)
                .post("/sorties")
                .then().statusCode(201);
    }

    @Test
    void vehiculeKpis_skipBackwardsOdometer_andComputeConso() {
        Long vehiculeId = insertVehicule("901", "camion", 100000);
        createSortie("2025-02-05", 200, "VOLVO 22299A73", vehiculeId, 100500.0);
        createSortie("2025-02-10", 150, "VOLVO 22299A73", vehiculeId, 100200.0); // odometer goes backwards
        createSortie("2025-02-15", 100, "VOLVO 22299A73", vehiculeId, 100700.0); // resyncs: +500 km
        createSortie("2025-02-16", 50, "SITRAK ARMABETON", null, null);          // unmatched, excluded

        asRole("FLEET_MANAGER")
                .get("/kpis/vehicule?code=901&month=2025-02")
                .then().statusCode(200)
                .body("voyagesMois", is(3))
                .body("consoLitresMois", is(450.0f))
                .body("kmParcourusMois", is(500.0f))
                .body("kmCumules", is(100700.0f))
                .body("consoMoyenneL100", is(90.0f))
                .body("pctConsoVsFlotte", is(100.0f));
    }

    @Test
    void vehiculeKpis_resolvesBareNumberAgainstPrefixedCode() {
        Long vehiculeId = insertVehicule("CAM-955", "camion", 1000);
        createSortie("2025-04-01", 100, "VOLVO", vehiculeId, null);

        asRole("MAGASIN")
                .get("/kpis/vehicule?code=955&month=2025-04")
                .then().statusCode(200)
                .body("code", is("CAM-955"))
                .body("voyagesMois", is(1));
    }

    @Test
    void vehiculeKpis_unknownCode_notFound() {
        asRole("MAGASIN")
                .get("/kpis/vehicule?code=99999")
                .then().statusCode(404)
                .body("code", is("VEHICULE_NOT_FOUND"));
    }

    @Test
    void dashboard_stockIsInitialPlusArrivagesMinusSorties() {
        Long vehiculeId = insertVehicule("902", "camion", 50000);
        createArrivage("2025-02-01", 16000);
        createSortie("2025-02-05", 500, "VOLVO 22300A73", vehiculeId, null);

        asRole("MAGASIN")
                .get("/kpis/dashboard?month=2025-02")
                .then().statusCode(200)
                .body("stockActuelLitres", is(15500.0f))
                .body("consoMoisLitres", is(500.0f))
                .body("capaciteLitres", is(20000.0f))
                .body("dernierArrivage.quantiteLitres", is(16000.0f))
                .body("topConsommateurs[0].label", is("902"))
                .body("topConsommateurs[0].litres", is(500.0f))
                .body("repartitionParType[0].categorie", is("camion"))
                .body("consoParMois.find { it.mois == '2025-02' }.litres", is(500.0f));
    }

    @Test
    void jaugeage_freezesTheoreticalStockAndEcart() {
        createArrivage("2025-02-01", 16000);
        Long vehiculeId = insertVehicule("903", "camion", 10000);
        createSortie("2025-02-05", 500, "VOLVO", vehiculeId, null);

        asRole("ADMIN")
                .contentType("application/json")
                .body(Map.of("rows", new Object[]{
                        Map.of("hauteurCm", 200, "litres", 20000),
                }))
                .put("/citerne/bareme")
                .then().statusCode(200);

        // 110 cm → 11 000 L measured; theoretical = 16 000 − 500 = 15 500
        asRole("MAGASIN")
                .contentType("application/json")
                .body(Map.of("dateJaugeage", "2025-02-20", "hauteurCm", 110))
                .post("/jaugeages")
                .then().statusCode(201)
                .body("litresMesures", is(11000.0f))
                .body("litresTheoriques", is(15500.0f))
                .body("ecartLitres", is(-4500.0f));

        // same date again → conflict
        asRole("MAGASIN")
                .contentType("application/json")
                .body(Map.of("dateJaugeage", "2025-02-20", "hauteurCm", 111))
                .post("/jaugeages")
                .then().statusCode(409)
                .body("code", is("JAUGEAGE_DEJA_SAISI"));
    }

    @Test
    void retour_addsFuelBackToStock() {
        createArrivage("2025-03-01", 1000);
        Map<String, Object> retour = Map.of(
                "dateSortie", "2025-03-02", "quantiteLitres", 100,
                "typeMouvement", "RETOUR", "destination", "RETOUR CUVE");
        asRole("MAGASIN").contentType("application/json").body(retour)
                .post("/sorties").then().statusCode(201);

        asRole("MAGASIN")
                .get("/kpis/dashboard?month=2025-03")
                .then().statusCode(200)
                .body("stockActuelLitres", is(1100.0f))
                .body("consoMoisLitres", is(-100.0f));
    }

    @Test
    void writes_deniedForFleetManager() {
        asRole("FLEET_MANAGER")
                .contentType("application/json")
                .body(Map.of("dateSortie", "2025-02-05", "quantiteLitres", 10,
                        "typeMouvement", "SORTIE", "destination", "X"))
                .post("/sorties")
                .then().statusCode(403);
    }

    @Test
    void export_returnsWorkbook() {
        asRole("MAGASIN")
                .get("/export/excel?entites=sorties,arrivages,jaugeages,kpis&month=2025-02")
                .then().statusCode(200)
                .header("Content-Disposition", containsString("magasin-gasoil-export.xlsx"))
                .header("Content-Type", containsString("spreadsheetml"));
    }

    @Test
    void export_withoutEntites_badRequest() {
        asRole("MAGASIN").get("/export/excel").then().statusCode(400);
    }
}
