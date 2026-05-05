package ma.intersig.gateway.exception;

public class WrongCurrentPasswordException extends RuntimeException {

    public WrongCurrentPasswordException() {
        super("Current password is incorrect.");
    }

    public WrongCurrentPasswordException(String message) {
        super(message);
    }
}