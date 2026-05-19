package ma.intersig.fleetcore.exception;

public class ReleveRegressionException extends BusinessException {

    public ReleveRegressionException(String message) {
        super(message, "RELEVE_REGRESSION", 422);
    }
}