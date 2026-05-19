package ma.intersig.gateway.exception;

public class SamePasswordException extends RuntimeException {
    public SamePasswordException() {
        super("New password must differ from current password.");
    }
}
