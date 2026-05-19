package ma.intersig.gateway.dto;

import java.util.Map;

public record ErrorEnvelope(String error, String code, Object details) {

    public static ErrorEnvelope of(String error, String code) {
        return new ErrorEnvelope(error, code, Map.of());
    }
}