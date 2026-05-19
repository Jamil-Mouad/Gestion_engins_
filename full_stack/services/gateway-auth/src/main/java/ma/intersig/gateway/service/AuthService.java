package ma.intersig.gateway.service;

import ma.intersig.gateway.config.JwtProperties;
import ma.intersig.gateway.dto.*;
import ma.intersig.gateway.entity.User;
import ma.intersig.gateway.exception.RefreshTokenExpiredException;
import ma.intersig.gateway.exception.RefreshTokenInvalidException;
import ma.intersig.gateway.exception.SamePasswordException;
import ma.intersig.gateway.exception.UserNotFoundException;
import ma.intersig.gateway.exception.WrongCurrentPasswordException;
import ma.intersig.gateway.repository.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class AuthService {

    // Pre-computed BCrypt hash of a random string, used for timing attack mitigation
    private static final String DUMMY_PASSWORD_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final PasswordEncoder passwordEncoder;
    private final RateLimitService rateLimitService;

    public AuthService(UserRepository userRepository,
                       JwtService jwtService,
                       JwtProperties jwtProperties,
                       PasswordEncoder passwordEncoder,
                       RateLimitService rateLimitService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.passwordEncoder = passwordEncoder;
        this.rateLimitService = rateLimitService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        User user = new User();
        user.setEmail(req.email());
        user.setPrenom(req.prenom());
        user.setNom(req.nom());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        userRepository.save(user);
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email()).orElse(null);
        String storedHash = user != null ? user.getPasswordHash() : DUMMY_PASSWORD_HASH;
        boolean validPassword = passwordEncoder.matches(req.password(), storedHash);
        if (user == null || !validPassword) {
            rateLimitService.recordFailure(req.email());
            throw new BadCredentialsException("Bad credentials");
        }
        rateLimitService.resetBucket(req.email());
        return buildAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public RefreshResponse refresh(RefreshRequest req) {
        User user = userRepository.findByRefreshToken(req.refreshToken())
                .orElseThrow(RefreshTokenInvalidException::new);

        if (user.getRefreshTokenExpiresAt() == null || user.getRefreshTokenExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new RefreshTokenExpiredException();
        }

        String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        return new RefreshResponse(newAccessToken);
    }

    @Transactional
    public void logout(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setRefreshToken(null);
            user.setRefreshTokenExpiresAt(null);
            userRepository.save(user);
        });
    }

    @Transactional(readOnly = true)
    public UserProfileDto getMe(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        return new UserProfileDto(
                user.getId(),
                user.getEmail(),
                user.getPrenom(),
                user.getNom(),
                user.getFonction(),
                user.getMatriculeEmp(),
                user.getSite(),
                user.getTelephone(),
                user.getDashboardConfig(),
                user.getPreferencesNotifications()
        );
    }

    @Transactional
    public void changePassword(Long userId, PasswordChangeRequest req) {
        User user = userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new WrongCurrentPasswordException();
        }
        if (req.currentPassword().equals(req.newPassword())) {
            throw new SamePasswordException();
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        user.setRefreshToken(null);
        user.setRefreshTokenExpiresAt(null);
        userRepository.save(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtService.generateRefreshToken();
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiresAt(OffsetDateTime.now().plusHours(jwtProperties.getRefreshTtlHours()));
        userRepository.save(user);
        return new AuthResponse(
                accessToken,
                refreshToken,
                new AuthResponse.UserDto(user.getId(), user.getEmail(), user.getPrenom(), user.getNom())
        );
    }
}