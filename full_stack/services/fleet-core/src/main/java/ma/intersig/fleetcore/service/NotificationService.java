package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.response.NotificationDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.entity.Notification;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.exception.BusinessException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.NotificationRepository;
import ma.intersig.fleetcore.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> list(Long userId, Boolean lu, Pageable pageable) {
        Page<Notification> page;
        if (lu != null) {
            page = notificationRepository.findByUserIdAndLu(userId, lu, pageable);
        } else {
            page = notificationRepository.findByUserId(userId, pageable);
        }
        return PageResponse.of(page.map(NotificationDto::from));
    }

    @Transactional(readOnly = true)
    public Map<String, Integer> countUnread(Long userId) {
        int count = notificationRepository.countByUserIdAndLuFalse(userId);
        return Map.of("count", count);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getCritiques(Long userId, int limit) {
        List<Notification> list = notificationRepository
                .findByUserIdAndLuFalseAndSeveriteOrderByCreatedAtDesc(
                        userId, "critical",
                        org.springframework.data.domain.PageRequest.of(0, limit));
        return list.stream().map(NotificationDto::from).toList();
    }

    public NotificationDto marquerLue(Long notifId, Long userId) {
        Notification notif = notificationRepository.findById(notifId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found", "NOTIFICATION_NOT_FOUND"));
        if (!notif.getUser().getId().equals(userId)) {
            throw new BusinessException("Cannot mark another user's notification", "FORBIDDEN", 403);
        }
        notif.setLu(true);
        notificationRepository.save(notif);
        return NotificationDto.from(notif);
    }

    public Map<String, Integer> marquerToutLue(Long userId) {
        int count = notificationRepository.markAllAsReadByUserId(userId);
        return Map.of("count", count);
    }

    @Transactional(readOnly = true)
    public String getConfig(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found", "USER_NOT_FOUND"));
        return user.getPreferencesNotifications();
    }

    @Transactional
    public void saveConfig(Long userId, String jsonb) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found", "USER_NOT_FOUND"));
        user.setPreferencesNotifications(jsonb);
        userRepository.save(user);
    }
}