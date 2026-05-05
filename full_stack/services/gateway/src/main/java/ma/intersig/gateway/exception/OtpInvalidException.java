package ma.intersig.gateway.exception;

public class OtpInvalidException extends RuntimeException {
    public OtpInvalidException() {
        super("Invalid or already used OTP code.");
    }
}