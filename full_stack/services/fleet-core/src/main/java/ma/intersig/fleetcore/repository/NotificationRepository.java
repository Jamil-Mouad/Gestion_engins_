package ma.intersig.fleetcore.repository;

import ma.intersig.fleetcore.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    int countByUserIdAndLuFalse(Long userId);

    Page<Notification> findByUserIdAndLu(Long userId, Boolean lu, Pageable pageable);

    Page<Notification> findByUserId(Long userId, Pageable pageable);

    List<Notification> findByUserIdAndLuFalseAndSeveriteOrderByCreatedAtDesc(Long userId, String severite, Pageable pageable);

    boolean existsByUserIdAndCategorieAndTargetIdAndLuFalseAndCreatedAtAfter(@Param("userId") Long userId,
                                                                              @Param("categorie") String categorie,
                                                                              @Param("targetId") Long targetId,
                                                                              @Param("createdAt") OffsetDateTime createdAt);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE Notification n SET n.lu = true WHERE n.user.id = :userId AND n.lu = false")
    int markAllAsReadByUserId(@Param("userId") Long userId);
}