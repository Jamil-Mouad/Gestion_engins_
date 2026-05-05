package ma.intersig.gateway.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import ma.intersig.gateway.dto.PasswordResetConfirmDto;
import ma.intersig.gateway.entity.User;
import ma.intersig.gateway.exception.OtpExpiredException;
import ma.intersig.gateway.exception.OtpInvalidException;
import ma.intersig.gateway.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Random;

@Service
public class PasswordResetService {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int OTP_LENGTH = 6;
    private static final int OTP_TTL_MINUTES = 15;
    private static final int RESET_TOKEN_TTL_MINUTES = 5;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final String mailFrom;

    public PasswordResetService(UserRepository userRepository,
                                 PasswordEncoder passwordEncoder,
                                 JavaMailSender mailSender,
                                 @Value("${app.mail.from}") String mailFrom) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.mailFrom = mailFrom;
    }

    @Transactional
    public void requestReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return;
        }

        String otp = generateOtp();
        user.setPasswordResetOtp(otp);
        user.setPasswordResetOtpExpiresAt(OffsetDateTime.now().plusMinutes(OTP_TTL_MINUTES));
        user.setPasswordResetOtpUsedAt(null);
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiresAt(null);
        userRepository.save(user);

        sendOtpEmail(user.getEmail(), user.getPrenom() + " " + user.getNom(), otp);
    }

    @Transactional
    public String verifyOtp(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(OtpInvalidException::new);

        if (user.getPasswordResetOtpUsedAt() != null) {
            throw new OtpInvalidException();
        }

        if (user.getPasswordResetOtpExpiresAt() == null
                || user.getPasswordResetOtpExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new OtpExpiredException();
        }

        if (!code.equals(user.getPasswordResetOtp())) {
            throw new OtpInvalidException();
        }

        user.setPasswordResetOtpUsedAt(OffsetDateTime.now());

        byte[] tokenBytes = new byte[32];
        new SecureRandom().nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        user.setPasswordResetToken(token);
        user.setPasswordResetTokenExpiresAt(OffsetDateTime.now().plusMinutes(RESET_TOKEN_TTL_MINUTES));
        userRepository.save(user);

        return token;
    }

    @Transactional
    public void confirmReset(PasswordResetConfirmDto dto) {
        User user = userRepository.findByEmail(dto.email())
                .orElseThrow(OtpInvalidException::new);

        if (user.getPasswordResetToken() == null
                || !dto.resetToken().equals(user.getPasswordResetToken())) {
            throw new OtpInvalidException();
        }

        if (user.getPasswordResetTokenExpiresAt() == null
                || user.getPasswordResetTokenExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new OtpExpiredException();
        }

        user.setPasswordHash(passwordEncoder.encode(dto.newPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiresAt(null);
        user.setRefreshToken(null);
        user.setRefreshTokenExpiresAt(null);
        userRepository.save(user);
    }

    private String generateOtp() {
        Random random = new Random();
        return String.format("%06d", random.nextInt(1_000_000));
    }

    private void sendOtpEmail(String to, String userName, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject("Réinitialisation de votre mot de passe — INTERSIG FleetTracker");
            helper.setText(buildEmailHtml(userName, otp), true);
            mailSender.send(message);
        } catch (MailException | MessagingException e) {
            logger.error("Failed to send password reset email to {}", to, e);
        }
    }

    private String buildEmailHtml(String userName, String otp) {
        String template = """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>Réinitialisation de votre mot de passe — INTERSIG FleetTracker</title>
            <link rel="preconnect" href="https://fonts.googleapis.com"/>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&amp;family=Open+Sans:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
            <style>
              *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: 'Open Sans', Arial, sans-serif;
                padding: 32px 16px;
                background: linear-gradient(135deg, #f5e6d3 0%, #fdf3e7 40%, #e8d5c0 100%);
                text-align: center;
              }
              .email-wrapper {
                width: 100%; max-width: 520px;
                margin: 0 auto;
                background: rgba(255,255,255,0.85);
                border: 1px solid rgba(255,255,255,0.75);
                border-radius: 20px; overflow: hidden;
                box-shadow: 0 0 0 1px rgba(247,148,29,0.12), 0 24px 64px rgba(180,100,0,0.15);
                text-align: left;
              }
              .email-header {
                padding: 28px 36px; display: flex; align-items: center; justify-content: center; gap: 14px;
                background: rgba(255,255,255,0.30);
                border-bottom: 1px solid rgba(255,255,255,0.55);
              }
              .logo-mark {
                width: 42px; height: 42px;
                background: linear-gradient(135deg, #F7941D, #E6851A);
                border-radius: 10px; flex-shrink: 0;
                display: inline-flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 16px rgba(247,148,29,0.40);
              }
              .logo-text { display: flex; flex-direction: column; gap: 1px; }
              .logo-intersig {
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 10px; font-weight: 700; letter-spacing: 0.16em;
                text-transform: uppercase; color: #C97010;
              }
              .logo-fleet {
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 15px; font-weight: 800; color: #1A1A1A; letter-spacing: 0.02em;
              }
              .accent-bar { height: 2px; background: linear-gradient(90deg, transparent 0%, #F7941D 30%, #FFB347 70%, transparent 100%); }
              .email-body { padding: 40px 36px 36px; }
              .email-title {
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 22px; font-weight: 700; color: #1A1A1A; margin-bottom: 12px; line-height: 1.3;
              }
              .email-intro { font-size: 14px; color: #4B5563; line-height: 1.75; margin-bottom: 32px; }
              .email-intro strong { color: #111827; font-weight: 600; }
              .code-label {
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
                color: rgba(247,148,29,0.80); margin-bottom: 10px;
              }
              .code-unified {
                background: rgba(255,255,255,0.75); border: 1px solid rgba(247,148,29,0.45);
                border-radius: 10px; padding: 16px 0; width: 68%;
                display: block; margin: 16px auto;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 34px; font-weight: 800; color: #1A1A1A; letter-spacing: 0.10em;
                text-align: center;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.90), 0 4px 12px rgba(180,100,0,0.12);
              }
              .code-hint { font-size: 12px; color: #9CA3AF; text-align: center; margin-bottom: 0; }
              .code-hint span { color: #F7941D; font-weight: 600; }
            </style>
            </head>
            <body>
            <div class="email-wrapper">
              <div class="email-header">
                <div class="logo-mark">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
                <div class="logo-text">
                  <span class="logo-intersig">INTERSIG</span>
                  <span class="logo-fleet">FleetTracker</span>
                </div>
              </div>
              <div class="accent-bar"></div>
              <div class="email-body">
                <h1 class="email-title">{{TITLE}}</h1>
                <p class="email-intro">
                  Bonjour <strong>{{USER_NAME}}</strong>,<br/>
                  Vous avez demandé la réinitialisation de votre mot de passe sur <strong>INTERSIG FleetTracker</strong>.
                  Utilisez le code ci-dessous pour confirmer votre identité.
                </p>
                <div class="code-label">Votre code de vérification</div>
                <div class="code-unified">{{OTP_CODE}}</div>
                <p class="code-hint">Ce code expire dans <span>{{EXPIRY}}</span></p>
              </div>
            </div>
            <div style="text-align:center;padding:16px 0;font-size:11px;color:#9CA3AF;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </div>
            </body>
            </html>
            """;
        return template
                .replace("{{TITLE}}", "Réinitialisation de votre mot de passe")
                .replace("{{USER_NAME}}", userName)
                .replace("{{OTP_CODE}}", otp)
                .replace("{{EXPIRY}}", OTP_TTL_MINUTES + " minutes");
    }
}
