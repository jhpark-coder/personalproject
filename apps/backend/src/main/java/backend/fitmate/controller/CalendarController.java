package backend.fitmate.controller;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;

import backend.fitmate.service.CalendarService;
import backend.fitmate.user.entity.User;
import backend.fitmate.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/calendar")
@CrossOrigin(origins = "${app.frontend.url}", allowCredentials = "true")
@RequiredArgsConstructor
public class CalendarController {

    private static final Logger log = LoggerFactory.getLogger(CalendarController.class);

    private final UserService userService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final CalendarService calendarService;

    @Value("${app.backend.url}")
    private String backendUrl;

    @GetMapping("/ping")
    public ResponseEntity<?> ping() {
        return ResponseEntity.ok(Map.of("message", "CalendarController ping ok", "timestamp", System.currentTimeMillis()));
    }

    @GetMapping("/auth/google")
    public ResponseEntity<?> startGoogleAuth(HttpServletRequest request) {
        try {
            Long userId = getUserIdFromAuthentication(SecurityContextHolder.getContext().getAuthentication());

            String calendarLinkingKey = "calendar_linking_user:" + userId;
            redisTemplate.opsForValue().set(calendarLinkingKey, userId.toString(), 300, java.util.concurrent.TimeUnit.SECONDS);

            String externalBaseUrl = resolveExternalBaseUrl(request);
            String authUrl = UriComponentsBuilder.fromHttpUrl(externalBaseUrl)
                    .path("/oauth2/authorization/google")
                    .queryParam("user_id", userId)
                    .queryParam("calendar_only", "true")
                    .toUriString();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Google authentication started.",
                "authUrl", authUrl
            ));
        } catch (Exception e) {
            log.warn("Calendar auth start failed.", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Failed to start Google authentication."
            ));
        }
    }

    private Long getUserIdFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InsufficientAuthenticationException("Unauthenticated user.");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails) {
            return Long.parseLong(((UserDetails) principal).getUsername());
        }

        if (principal instanceof String) {
            String principalStr = (String) principal;
            if (principalStr.contains(":")) {
                String[] parts = principalStr.split(":", 2);
                String provider = parts[0];
                String oauthId = parts[1];
                return userService.findByProviderAndOAuthId(provider, oauthId)
                        .map(User::getId)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found for OAuth2 principal."));
            }

            return Long.parseLong(principalStr);
        }

        throw new UsernameNotFoundException("Cannot extract user id from authentication.");
    }

    private String resolveExternalBaseUrl(HttpServletRequest request) {
        if (backendUrl != null && !backendUrl.isBlank()) {
            return backendUrl.replaceAll("/$", "");
        }
        return request.getRequestURL().toString().replace(request.getRequestURI(), "");
    }

    @GetMapping("/start-google-auth")
    public void startGoogleAuthDirect(HttpServletResponse response) throws IOException {
        response.sendRedirect(backendUrl + "/oauth2/authorization/google");
    }

    @PostMapping("/link-google-to-naver")
    public ResponseEntity<?> linkGoogleToNaver(@RequestBody Map<String, Object> requestBody) {
        return manualLinkingDisabled();
    }

    @PostMapping("/link-google")
    public ResponseEntity<?> linkGoogleCalendar(@RequestBody Map<String, Object> requestBody) {
        return manualLinkingDisabled();
    }

    private ResponseEntity<?> manualLinkingDisabled() {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
            "success", false,
            "message", "Manual Google linking endpoint is disabled. Use /api/calendar/auth/google."
        ));
    }

    private boolean isAuthenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        return !(principal instanceof String && "anonymousUser".equals(principal));
    }

    @GetMapping("/events")
    public ResponseEntity<?> getUpcomingEvents(@RequestParam(defaultValue = "10") int maxResults) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }

        try {
            List<Event> events = calendarService.getUpcomingEvents(maxResults);
            return ResponseEntity.ok(formatEvents(events));
        } catch (IOException | GeneralSecurityException e) {
            log.warn("Calendar events load failed.", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to load calendar events."));
        }
    }

    private List<Map<String, Object>> formatEvents(List<Event> events) {
        return events.stream().map(event -> {
            Map<String, Object> formattedEvent = new HashMap<>();

            formattedEvent.put("id", event.getId());
            formattedEvent.put("title", event.getSummary() != null ? event.getSummary() : "Untitled");
            formattedEvent.put("description", event.getDescription());
            formattedEvent.put("location", event.getLocation());
            formattedEvent.put("htmlLink", event.getHtmlLink());

            String startDate = formatEventDateTime(event.getStart());
            String endDate = formatEventDateTime(event.getEnd());

            formattedEvent.put("startDate", startDate);
            formattedEvent.put("endDate", endDate);

            boolean isAllDay = event.getStart() != null && event.getStart().getDateTime() == null;
            formattedEvent.put("isAllDay", isAllDay);

            if (event.getCreator() != null) {
                formattedEvent.put("creator", Map.of(
                    "email", event.getCreator().getEmail() != null ? event.getCreator().getEmail() : "",
                    "displayName", event.getCreator().getDisplayName() != null ? event.getCreator().getDisplayName() : ""
                ));
            }

            formattedEvent.put("created", event.getCreated() != null ? event.getCreated().toString() : null);
            return formattedEvent;
        }).toList();
    }

    private String formatEventDateTime(com.google.api.services.calendar.model.EventDateTime eventDateTime) {
        if (eventDateTime == null) {
            return null;
        }

        if (eventDateTime.getDateTime() != null) {
            return eventDateTime.getDateTime().toString();
        }

        if (eventDateTime.getDate() != null) {
            return eventDateTime.getDate().toString();
        }

        return null;
    }

    @PostMapping("/events")
    public ResponseEntity<?> createEvent(@RequestBody Map<String, Object> eventData) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }

        try {
            String summary = (String) eventData.get("summary");
            String description = (String) eventData.get("description");
            String location = (String) eventData.get("location");
            String startDateTimeStr = (String) eventData.get("startDateTime");
            String endDateTimeStr = (String) eventData.get("endDateTime");

            @SuppressWarnings("unchecked")
            List<String> attendeeEmails = (List<String>) eventData.get("attendeeEmails");

            DateTime startDateTime = new DateTime(startDateTimeStr);
            DateTime endDateTime = new DateTime(endDateTimeStr);

            Event createdEvent = calendarService.createEvent(summary, description, location,
                    startDateTime, endDateTime, attendeeEmails);

            return ResponseEntity.ok(createdEvent);
        } catch (IOException | GeneralSecurityException e) {
            log.warn("Calendar event create failed.", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to create event."));
        }
    }

    @GetMapping("/events/{eventId}")
    public ResponseEntity<?> getEvent(@PathVariable String eventId) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }

        try {
            Event event = calendarService.getEvent(eventId);
            return ResponseEntity.ok(event);
        } catch (IOException | GeneralSecurityException e) {
            log.warn("Calendar event load failed.", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to load event."));
        }
    }

    @PutMapping("/events/{eventId}")
    public ResponseEntity<?> updateEvent(@PathVariable String eventId, @RequestBody Event updatedEvent) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }

        try {
            Event event = calendarService.updateEvent(eventId, updatedEvent);
            return ResponseEntity.ok(event);
        } catch (IOException | GeneralSecurityException e) {
            log.warn("Calendar event update failed.", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to update event."));
        }
    }

    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<?> deleteEvent(@PathVariable String eventId) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }

        try {
            calendarService.deleteEvent(eventId);
            return ResponseEntity.ok(Map.of("message", "Event deleted."));
        } catch (IOException | GeneralSecurityException e) {
            log.warn("Calendar event delete failed.", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to delete event."));
        }
    }

    @GetMapping("/events/range")
    public ResponseEntity<?> getEventsInRange(@RequestParam String startTime,
                                            @RequestParam String endTime) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }

        try {
            DateTime startDateTime = new DateTime(startTime);
            DateTime endDateTime = new DateTime(endTime);
            List<Event> events = calendarService.getEventsInRange(startDateTime, endDateTime);
            return ResponseEntity.ok(formatEvents(events));
        } catch (IOException | GeneralSecurityException e) {
            log.warn("Calendar event range load failed.", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to load calendar events."));
        }
    }

    @PostMapping("/workout")
    public ResponseEntity<?> createWorkoutEvent(@RequestBody Map<String, Object> workoutData) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }

        try {
            String workoutName = (String) workoutData.get("name");
            String description = (String) workoutData.get("description");
            String location = (String) workoutData.get("location");
            String startTime = (String) workoutData.get("startTime");
            String endTime = (String) workoutData.get("endTime");

            @SuppressWarnings("unchecked")
            List<String> attendeeEmails = (List<String>) workoutData.get("attendeeEmails");

            String summary = workoutName + " workout";
            DateTime startDateTime = new DateTime(startTime);
            DateTime endDateTime = new DateTime(endTime);

            Event createdEvent = calendarService.createEvent(summary, description, location,
                    startDateTime, endDateTime, attendeeEmails);

            return ResponseEntity.ok(createdEvent);
        } catch (IOException | GeneralSecurityException e) {
            log.warn("Calendar workout event create failed.", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to create workout event."));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> getCalendarStatus() {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required."));
        }

        try {
            calendarService.getUpcomingEvents(1);
            return ResponseEntity.ok(Map.of(
                "connected", true,
                "provider", "google",
                "message", "Calendar connected."
            ));
        } catch (IOException | GeneralSecurityException e) {
            return ResponseEntity.ok(Map.of(
                "connected", false,
                "provider", "google",
                "message", "Calendar connection failed."
            ));
        }
    }
}
