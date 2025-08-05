package backend.fitmate.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

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

import backend.fitmate.User.entity.User;
import backend.fitmate.User.service.UserService;
import backend.fitmate.config.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;

@Service
public class CalendarService {

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

    /**
     * 사용자 정보를 재시도 로직으로 조회 (DB 업데이트 대기 + 강제 DB 조회)
     */
    private User getUserWithRetry(Long userId, int maxRetries, int delayMs) {
        for (int i = 0; i < maxRetries; i++) {
            // 강제로 DB에서 최신 데이터 조회 (JPA 캐시 우회)
            User user = userService.findByIdWithRefresh(userId).orElse(null);
            
            if (user != null && user.getGoogleOAuthId() != null) {
                System.out.println("사용자 정보 조회 성공 (시도 " + (i + 1) + "회): Google OAuth ID = " + user.getGoogleOAuthId());
                return user;
            }
            
            if (i < maxRetries - 1) {
                // 점진적 대기 시간 증가 (500ms → 750ms → 1000ms → 1250ms → 1500ms)
                int currentDelay = delayMs + (i * 250);
                System.out.println("Google OAuth ID 미설정, " + currentDelay + "ms 후 재시도... (시도 " + (i + 1) + "/" + maxRetries + ")");
                try {
                    Thread.sleep(currentDelay);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        
        // 최종 시도도 강제 DB 조회
        User finalUser = userService.findByIdWithRefresh(userId).orElse(null);
        System.out.println("사용자 정보 최종 조회 완료: userId=" + userId + ", googleOAuthId=" + 
                          (finalUser != null ? finalUser.getGoogleOAuthId() : "사용자 없음"));
        return finalUser;
    }

    /**
     * Google OAuth2 토큰을 Redis에 저장
     */
    public void saveGoogleTokenToRedis(String googleOAuthId, String accessToken, String refreshToken) {
        String key = "google_token:" + googleOAuthId;
        
        Map<String, String> tokenData = new HashMap<>();
        tokenData.put("access_token", accessToken);
        if (refreshToken != null) {
            tokenData.put("refresh_token", refreshToken);
        }
        tokenData.put("timestamp", String.valueOf(System.currentTimeMillis()));
        
        redisTemplate.opsForHash().putAll(key, tokenData);
        redisTemplate.expire(key, 3600, TimeUnit.SECONDS); // 1시간 TTL
        
        System.out.println("Google 토큰 Redis 저장 완료: " + googleOAuthId);
    }
    
    /**
     * Redis에서 Google OAuth2 토큰 조회
     */
    public Map<String, String> getGoogleTokenFromRedis(String googleOAuthId) {
        String key = "google_token:" + googleOAuthId;
        
        Map<Object, Object> tokenData = redisTemplate.opsForHash().entries(key);
        if (tokenData.isEmpty()) {
            return null;
        }
        
        Map<String, String> result = new HashMap<>();
        tokenData.forEach((k, v) -> result.put(k.toString(), v.toString()));
        
        System.out.println("Google 토큰 Redis 조회 완료: " + googleOAuthId);
        return result;
    }

    /**
     * Google Calendar API 클라이언트를 생성합니다.
     */
    public Calendar getCalendarService() throws IOException, GeneralSecurityException {
        final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
        return new Calendar.Builder(HTTP_TRANSPORT, JSON_FACTORY, getCredentials(HTTP_TRANSPORT))
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    /**
     * JWT 기반으로 Google API 인증 정보를 생성합니다.
     */
    private Credential getCredentials(final NetHttpTransport HTTP_TRANSPORT) throws IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // OAuth2AuthenticationToken 처리 (캘린더 연동 직후)
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
        
        // JWT 토큰에서 사용자 정보 추출하여 Redis에서 Google 토큰 조회
        try {
            String jwt = extractJwtFromRequest();
            
            if (jwt != null && jwtTokenProvider.validateToken(jwt)) {
                String userId = jwtTokenProvider.getUserIdFromToken(jwt);
                
                // 최신 사용자 정보 조회 (재시도 로직 포함 - 강화)
                User user = getUserWithRetry(Long.parseLong(userId), 5, 500);
                
                if (user != null && user.getGoogleOAuthId() != null) {
                    System.out.println("회원정보에서 구글 OAuth ID 확인: " + user.getGoogleOAuthId());
                    
                    // Redis에서 Google 토큰 조회
                    Map<String, String> tokenData = getGoogleTokenFromRedis(user.getGoogleOAuthId());
                    
                    if (tokenData != null && tokenData.get("access_token") != null) {
                        System.out.println("Redis에서 Google 토큰 조회 성공");
                        
                        Credential credential = new Credential(BearerToken.authorizationHeaderAccessMethod())
                            .setAccessToken(tokenData.get("access_token"));
                        
                        if (tokenData.get("refresh_token") != null) {
                            credential.setRefreshToken(tokenData.get("refresh_token"));
                        }
                        
                        return credential;
                    } else {
                        System.out.println("Redis에서 Google 토큰을 찾을 수 없음: " + user.getGoogleOAuthId());
                    }
                } else {
                    System.out.println("사용자의 구글 OAuth ID가 설정되지 않음 (재시도 완료 후에도)");
                }
            }
        } catch (Exception e) {
            System.err.println("JWT 토큰 처리 중 오류: " + e.getMessage());
        }
        
        throw new IOException("Google 캘린더 연동이 필요합니다. 설정에서 캘린더를 연동해주세요.");
    }
    
    /**
     * HTTP 요청에서 JWT 토큰을 추출합니다.
     */
    private String extractJwtFromRequest() {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            return authorizationHeader.substring(7); // "Bearer " 뒤의 토큰 값
        }
        return null;
    }

    /**
     * 사용자의 캘린더에서 이벤트 목록을 가져옵니다.
     */
    public List<Event> getUpcomingEvents(int maxResults) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();
        
        DateTime now = new DateTime(System.currentTimeMillis());
        System.out.println("=== Google Calendar API 호출 ===");
        System.out.println("현재 시간: " + now);
        System.out.println("최대 결과 수: " + maxResults);
        
        Events events = service.events().list("primary")
                .setMaxResults(maxResults)
                .setTimeMin(now)
                .setOrderBy("startTime")
                .setSingleEvents(true)
                .execute();

        List<Event> eventList = events.getItems();
        System.out.println("가져온 이벤트 수: " + eventList.size());
        
        // 첫 번째 이벤트의 상세 정보 출력
        if (!eventList.isEmpty()) {
            Event firstEvent = eventList.get(0);
            System.out.println("=== 첫 번째 이벤트 상세 정보 ===");
            System.out.println("ID: " + firstEvent.getId());
            System.out.println("Summary: " + firstEvent.getSummary());
            System.out.println("Description: " + firstEvent.getDescription());
            System.out.println("Location: " + firstEvent.getLocation());
            System.out.println("Start: " + firstEvent.getStart());
            System.out.println("End: " + firstEvent.getEnd());
            System.out.println("HTML Link: " + firstEvent.getHtmlLink());
            
            // 시작 시간과 종료 시간의 상세 정보
            if (firstEvent.getStart() != null) {
                System.out.println("Start DateTime: " + firstEvent.getStart().getDateTime());
                System.out.println("Start Date: " + firstEvent.getStart().getDate());
                System.out.println("Start TimeZone: " + firstEvent.getStart().getTimeZone());
            }
            
            if (firstEvent.getEnd() != null) {
                System.out.println("End DateTime: " + firstEvent.getEnd().getDateTime());
                System.out.println("End Date: " + firstEvent.getEnd().getDate());
                System.out.println("End TimeZone: " + firstEvent.getEnd().getTimeZone());
            }
        }

        return eventList;
    }

    /**
     * 새로운 이벤트를 생성합니다.
     */
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

        // 참석자 추가
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

    /**
     * 특정 이벤트를 가져옵니다.
     */
    public Event getEvent(String eventId) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();
        return service.events().get("primary", eventId).execute();
    }

    /**
     * 이벤트를 업데이트합니다.
     */
    public Event updateEvent(String eventId, Event updatedEvent) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();
        return service.events().update("primary", eventId, updatedEvent)
                .setSendUpdates("all")
                .execute();
    }

    /**
     * 이벤트를 삭제합니다.
     */
    public void deleteEvent(String eventId) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarService();
        service.events().delete("primary", eventId).execute();
    }

    /**
     * 특정 날짜 범위의 이벤트를 가져옵니다.
     */
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