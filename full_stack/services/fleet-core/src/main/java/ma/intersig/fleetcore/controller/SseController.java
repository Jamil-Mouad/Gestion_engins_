package ma.intersig.fleetcore.controller;

import ma.intersig.fleetcore.sse.SseBroadcaster;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "Events", description = "Server-Sent Events stream for realtime cache invalidation")
@RestController
@RequestMapping("/api/v1/events")
public class SseController {

    private final SseBroadcaster broadcaster;

    public SseController(SseBroadcaster broadcaster) {
        this.broadcaster = broadcaster;
    }

    @Operation(summary = "Subscribe to entity change events")
    @GetMapping("/stream")
    public SseEmitter stream() {
        return broadcaster.register();
    }
}
