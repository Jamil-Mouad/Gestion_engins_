package ma.intersig.fleetcore.exception;

public class InvalidTransitionException extends BusinessException {

    public InvalidTransitionException(String message) {
        super(message, "INVALID_TRANSITION", 422);
    }
}