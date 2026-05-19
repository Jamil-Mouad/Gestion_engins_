package ma.intersig.fleetcore.unit;

import ma.intersig.fleetcore.dto.response.NotificationDto;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatNullPointerException;

class NotificationDtoTest {

    @Test
    void from_null_throwsNullPointerExceptionWithMessage() {
        assertThatNullPointerException()
                .isThrownBy(() -> NotificationDto.from(null))
                .withMessage("Notification must not be null");
    }
}
