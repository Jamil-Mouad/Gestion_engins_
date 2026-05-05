package ma.intersig.gateway.exception;

public class OtpExpiredException extends RuntimeException {
    public OtpExpiredException() {
        super("OTP code has expired. Please request a new one.");
    }
}