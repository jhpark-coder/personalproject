package backend.fitmate.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.google.api.client.auth.oauth2.BearerToken;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventAttendee;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.Events;

import backend.fitmate.config.JwtTokenProvider;
import backend.fitmate.user.entity.User;
import backend.fitmate.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;

@Service
public class CalendarService {

    private static final Logger log = LoggerFactory.getLogger(CalendarService.class);
    private static final String APPLICATION_NAME = "FitMate Calendar API";
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Arrays.asList(
        CalendarScopes.CALENDAR,
        CalendarScopes.CALENDAR_EVENTS
    );

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String clientSecret;

    private final OAuth2AuthorizedClientService clientService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    public CalendarService(OAuth2AuthorizedClientService clientService) {
        this.clientService = clientService;
    }

    private User getUserWithRetry(Long userId, int maxRetries, int delayMs) {
        for (int i = 0; i < maxRetries; i++) {
            User user = userService.findByIdWithRefresh(userId).orElse(null);

            if (user != null && user.getGoogleOAuthId() != null) {
                log.debug("Calendar user lookup succeeded: userId={}, attempt={}", userId, i + 1);
                return user;
            }

            if (i < maxRetries - 1) {
                int currentDelay = delayMs + (i * 250);
                log.debug("Calendar user missing Google link; retrying: userId={}, attempt={}/{}", userId, i + 1, maxRetries);
                try {
                    Thread.sleep(currentDelay);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        User finalUser = userService.findByIdWithRefresh(userId).orElse(null);
        log.debug("Calendar user final lookup completed: userId={}, linked={}", userId, finalUser != null && finalUser.getGoogleOAuthId() != null);
        return finalUser;
    }

    public void saveGoogleTokenToRedis(String googleOAuthId, String accessToken, String refreshToken) {
        String key = "google_token:" + googleOAuthId;

        Map<String, String> tokenData = new HashMap<>();
        tokenData.put("access_token", accessToken);
        if (refreshToken != null) {
            tokenData.put("refresh_token", refreshToken);
        }
        tokenData.put("timestamp", String.valueOf(System.currentTimeMillis()));

        redisTemplate.opsForHash().putAll(key, tokenData);
        redisTemplate.expire(key, 3600, TimeUnit.SECONDS);

        log.debug("Google token stored in Redis for calendar integration.");
    }

    public Map<String, String> getGoogleTokenFromRedis(String googleOAuthId) {
        String key = "google_token:" + googleOAuthId;

        Map<Object, Object> tokenData = redisTemplate.opsForHash().entries(key);
        if (tokenData.isEmpty()) {
            return null;
        }

        Map<String, String> result = new HashMap<>();
        tokenData.forEach((k, v) -> result.put(k.toString(), v.toString()));

        log.debug("Google token loaded from Redis for calendar integration.");
        return result;
    }

    public Calendar getCalendarService() throws IOException, GeneralSecurityException {
        final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
        return new Calendar.Builder(HTTP_TRANSPORT, JSON_FACTORY, getCredentials(HTTP_TRANSPORT))
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    private Credential getCredentials(final NetHttpTransport HTTP_TRANSPORT) throws IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication instanceof OAuth2AuthenticationToken) {
            OAuth2AuthenticationToken oauth2Token = (OAuth2AuthenticationToken) authentication;
            OAuth2AuthorizedClient client = clientService.loadAuthorizedClient(
                oauth2Token.getAuthorizedClientRegistrationId(),
                oauth2Token.getName()
            );
            if (client != null) {
                String accessToken = client.getAccessToken().getTokenValue();
                Credential credential = new Credential(BearerToken.authorizationHeaderAccessMethod())
                    .setAccessToken(accessToken);
                if (client.getRefreshToken() != null) {
                    credential.setRefreshToken(client.getRefreshToken().getTokenValue());
                }
                return credential;
            }
        }

        try {
            String jwt = extractJwtFromRequest();

            if (jwt != null && jwtTokenProvider.validateToken(jwt)) {
                String userId = jwtTokenProvider.getUserIdFromToken(jwt);
                User user = getUserWithRetry(Long.parseLong(userId), 5, 500);

                if (user != null && user.getGoogleOAuthId() != null) {
                    Map<String, String> tokenData = getGoogleTokenFromRedis(user.getGoogleOAuthId());

                    if (tokenData != null && tokenData.get("access_token") != null) {
                        Credential credential = new Credential(BearerToken.authorizationHeaderAccessMethod())
                            .setAccessToken(tokenData.get("access_token"));

                        if (tokenData.get("refresh_token") != null) {
                            credential.setRefreshToken(tokenData.get("refresh_token"));
                        }

                        return credential;
                    }

                    log.debug("Google token not found in Redis for calendar integration.");
                } else {
                    log.debug("User has no Google OAuth link for calendar integration.");
                }
            }
        } catch (Exception e) {
            log.warn("JWT processing failed while preparing Google Calendar credentials.", e);
        }

        throw new IOException("Google Calendar integration is required. Connect a calendar in settings.");
    }

    private String extractJwtFromRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return null;
        }

        HttpServletRequest request = attributes.getRequest();
        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            return authorizationHeader.substring(7);
        }
        return null;
    }

    public List<Event> getUpcomingEvents(int maxResults) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();

        DateTime now = new DateTime(System.currentTimeMillis());
        Events events = service.events().list("primary")
                .setMaxResults(maxResults)
                .setTimeMin(now)
                .setOrderBy("startTime")
                .setSingleEvents(true)
                .execute();

        List<Event> eventList = events.getItems();
        log.debug("Google Calendar events loaded: count={}", eventList.size());
        return eventList;
    }

    public Event createEvent(String summary, String description, String location,
                           DateTime startDateTime, DateTime endDateTime,
                           List<String> attendeeEmails) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();

        Event event = new Event()
                .setSummary(summary)
                .setDescription(description)
                .setLocation(location);

        EventDateTime start = new EventDateTime()
                .setDateTime(startDateTime)
                .setTimeZone("Asia/Seoul");
        event.setStart(start);

        EventDateTime end = new EventDateTime()
                .setDateTime(endDateTime)
                .setTimeZone("Asia/Seoul");
        event.setEnd(end);

        if (attendeeEmails != null && !attendeeEmails.isEmpty()) {
            List<EventAttendee> attendees = attendeeEmails.stream()
                    .map(email -> new EventAttendee().setEmail(email))
                    .toList();
            event.setAttendees(attendees);
        }

        return service.events().insert("primary", event)
                .setSendUpdates("all")
                .execute();
    }

    public Event getEvent(String eventId) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();
        return service.events().get("primary", eventId).execute();
    }

    public Event updateEvent(String eventId, Event updatedEvent) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();
        return service.events().update("primary", eventId, updatedEvent)
                .setSendUpdates("all")
                .execute();
    }

    public void deleteEvent(String eventId) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();
        service.events().delete("primary", eventId).execute();
    }

    public List<Event> getEventsInRange(DateTime startTime, DateTime endTime) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();

        Events events = service.events().list("primary")
                .setTimeMin(startTime)
                .setTimeMax(endTime)
                .setOrderBy("startTime")
                .setSingleEvents(true)
                .execute();

        return events.getItems();
    }
}
