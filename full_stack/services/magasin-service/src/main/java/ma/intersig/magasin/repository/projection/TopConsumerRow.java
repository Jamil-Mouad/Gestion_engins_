package ma.intersig.magasin.repository.projection;

import java.math.BigDecimal;

public interface TopConsumerRow {
    String getLabel();
    Long getVehiculeId();
    BigDecimal getLitres();
    Long getNbSorties();
}
