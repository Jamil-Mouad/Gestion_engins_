package ma.intersig.magasin.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record BaremeUpdateRequest(@NotNull @Valid List<Row> rows) {

    public record Row(
            @NotNull @DecimalMin(value = "0") BigDecimal hauteurCm,
            @NotNull @DecimalMin(value = "0") BigDecimal litres
    ) {
    }
}
