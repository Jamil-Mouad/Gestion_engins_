package ma.intersig.gateway.exception;

import io.jsonwebtoken.JwtException;
import ma.intersig.gateway.dto.ErrorEnvelope;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorEnvelope> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        return ResponseEntity.unprocessableEntity()
                .body(ErrorEnvelope.of(message, "VALIDATION_ERROR"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorEnvelope> handleDataIntegrity(DataIntegrityViolationException ex) {
        String message = ex.getMostSpecificCause() != null && ex.getMostSpecificCause().getMessage() != null
                ? ex.getMostSpecificCause().getMessage().toLowerCase()
                : "";

        if (message.contains("users_email_key")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ErrorEnvelope.of("Un compte existe déjà avec cet email.", "EMAIL_ALREADY_EXISTS"));
        } else if (message.contains("users_username_key")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ErrorEnvelope.of("Un compte existe déjà avec ce nom d'utilisateur.", "USERNAME_ALREADY_EXISTS"));
        } else if (message.contains("foreign key") || message.contains("fk_")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ErrorEnvelope.of("Violation de clé étrangère.", "FOREIGN_KEY_VIOLATION"));
        }

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorEnvelope.of("Conflit de données.", "DATA_CONFLICT"));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorEnvelope> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorEnvelope.of("Email ou mot de passe incorrect.", "INVALID_CREDENTIALS"));
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ErrorEnvelope> handleRateLimit(RateLimitException ex) {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Retry-After", String.valueOf(ex.getRetryAfterSeconds()));
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .headers(headers)
                .body(ErrorEnvelope.of("Trop de tentatives. Réessayez dans quelques secondes.", "RATE_LIMITED"));
    }

    @ExceptionHandler(RefreshTokenInvalidException.class)
    public ResponseEntity<ErrorEnvelope> handleRefreshTokenInvalid(RefreshTokenInvalidException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorEnvelope.of("Token de rafraîchissement invalide.", "REFRESH_TOKEN_INVALID"));
    }

    @ExceptionHandler(RefreshTokenExpiredException.class)
    public ResponseEntity<ErrorEnvelope> handleRefreshTokenExpired(RefreshTokenExpiredException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorEnvelope.of("Session expirée. Veuillez vous reconnecter.", "REFRESH_TOKEN_EXPIRED"));
    }

    @ExceptionHandler(WrongCurrentPasswordException.class)
    public ResponseEntity<ErrorEnvelope> handleWrongCurrentPassword(WrongCurrentPasswordException ex) {
        return ResponseEntity.unprocessableEntity()
                .body(ErrorEnvelope.of("Mot de passe actuel incorrect.", "WRONG_CURRENT_PASSWORD"));
    }

    @ExceptionHandler(SamePasswordException.class)
    public ResponseEntity<ErrorEnvelope> handleSamePassword(SamePasswordException ex) {
        return ResponseEntity.unprocessableEntity()
                .body(ErrorEnvelope.of("Le nouveau mot de passe doit être différent du mot de passe actuel.", "SAME_PASSWORD"));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorEnvelope> handleUserNotFound(UserNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorEnvelope.of("Utilisateur non trouvé.", "USER_NOT_FOUND"));
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ErrorEnvelope> handleJwtException(JwtException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorEnvelope.of("Token invalide ou expiré.", "UNAUTHORIZED"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorEnvelope> handleGeneral(Exception ex) {
        logger.error("Unhandled exception in handleGeneral", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorEnvelope.of("Erreur interne.", "INTERNAL_ERROR"));
    }

    @ExceptionHandler(OtpInvalidException.class)
    public ResponseEntity<ErrorEnvelope> handleOtpInvalid(OtpInvalidException ex) {
        return ResponseEntity.unprocessableEntity()
                .body(ErrorEnvelope.of("Code invalide ou déjà utilisé.", "INVALID_OTP"));
    }

    @ExceptionHandler(OtpExpiredException.class)
    public ResponseEntity<ErrorEnvelope> handleOtpExpired(OtpExpiredException ex) {
        return ResponseEntity.unprocessableEntity()
                .body(ErrorEnvelope.of("Le code a expiré. Veuillez en demander un nouveau.", "OTP_EXPIRED"));
    }
}