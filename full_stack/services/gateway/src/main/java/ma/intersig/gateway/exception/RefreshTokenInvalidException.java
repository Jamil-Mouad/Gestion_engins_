package ma.intersig.gateway.exception;

public class RefreshTokenInvalidException extends RuntimeException {

    public RefreshTokenInvalidException() {
        super("Invalid refresh token.");
    }
}