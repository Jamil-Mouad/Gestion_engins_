package ma.intersig.fleetcore.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public UserService(UserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public User getMe(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found", "USER_NOT_FOUND"));
    }

    @Transactional
    public User updateMe(Long userId, String prenom, String nom, String telephone) {
        if (prenom == null || prenom.isBlank()) {
            throw new BusinessException("prenom is required", "VALIDATION_ERROR", 422);
        }
        if (nom == null || nom.isBlank()) {
            throw new BusinessException("nom is required", "VALIDATION_ERROR", 422);
        }
        User user = getMe(userId);
        user.setPrenom(prenom);
        user.setNom(nom);
        user.setTelephone(telephone != null && telephone.isBlank() ? null : telephone);
        return userRepository.save(user);
    }

    public String getDashboardConfig(Long userId) {
        User user = getMe(userId);
        return user.getDashboardConfig();
    }

    @Transactional
    public void saveDashboardConfig(Long userId, String jsonb) {
        try { objectMapper.readTree(jsonb); } catch (Exception e) {
            throw new IllegalArgumentException("dashboardConfig is not valid JSON");
        }
        User user = getMe(userId);
        user.setDashboardConfig(jsonb);
        userRepository.save(user);
    }

    public String getPreferencesNotifications(Long userId) {
        User user = getMe(userId);
        return user.getPreferencesNotifications();
    }

    @Transactional
    public void savePreferencesNotifications(Long userId, String jsonb) {
        try { objectMapper.readTree(jsonb); } catch (Exception e) {
            throw new IllegalArgumentException("preferencesNotifications is not valid JSON");
        }
        User user = getMe(userId);
        user.setPreferencesNotifications(jsonb);
        userRepository.save(user);
    }
}