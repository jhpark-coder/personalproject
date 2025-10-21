package backend.fitmate.domain.calendar.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.google.api.client.auth.oauth2.BearerToken;
import com.google.api.client.auth.oauth2.ClientParametersAuthentication;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.auth.oauth2.TokenResponseException;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.UrlEncodedContent;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventAttendee;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.Events;

import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;

@Service 
@RequiredArgsConstructor
public class CalendarService {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final String APPLICATION_NAME = "FitMate Calendar";
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final UserService userService;
    
    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;
    
    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String clientSecret;

    /**
     * Google Calendar 연동을 완전히 해제합니다. (토큰 해제 포함)
     * @param userId 연동을 해제할 사용자의 ID
     * @return 성공적으로 해제되면 true, 그렇지 않으면 false
     */
    public boolean disconnectCalendar(Long userId) {
        try {
            User user = userService.findById(userId).orElse(null);
            if (user == null || user.getGoogleOAuthId() == null) {
                System.err.println("연동 해제 실패: 사용자를 찾을 수 없거나 Google 계정이 연결되어 있지 않습니다.");
                return false;
            }

            String googleOAuthId = user.getGoogleOAuthId();
            Map<String, String> tokenData = getGoogleTokenFromRedis(googleOAuthId);

            // Google에 토큰 해제(Revoke) 요청
            if (tokenData != null && tokenData.get("access_token") != null) {
                revokeGoogleToken(tokenData.get("access_token"));
            }

            // Redis에서 토큰 삭제
            String redisKey = "google_token:" + googleOAuthId;
            redisTemplate.delete(redisKey);

            // DB에서 사용자 정보 업데이트
            user.setGoogleOAuthId(null);
            user.setGoogleEmail(null);
            user.setGoogleName(null);
            user.setGooglePicture(null);
            userService.save(user);
            
            System.out.println("사용자 ID " + userId + "의 Google Calendar 연동이 성공적으로 해제되었습니다.");
            return true;

        } catch (Exception e) {
            System.err.println("캘린더 연동 해제 중 오류 발생: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Google OAuth2 토큰을 해제합니다.
     * @param token 해제할 Access Token
     */
    private void revokeGoogleToken(String token) {
        try {
            HttpTransport httpTransport = new NetHttpTransport();
            HttpRequestFactory requestFactory = httpTransport.createRequestFactory();
            GenericUrl url = new GenericUrl("https://oauth2.googleapis.com/revoke");
            
            Map<String, String> params = new HashMap<>();
            params.put("token", token);
            
            HttpRequest request = requestFactory.buildPostRequest(url, new UrlEncodedContent(params));
            HttpResponse response = request.execute();

            if (response.isSuccessStatusCode()) {
                System.out.println("Google 토큰이 성공적으로 해제되었습니다.");
            } else {
                System.err.println("Google 토큰 해제 실패: " + response.getStatusMessage());
            }
        } catch (IOException e) {
            System.err.println("Google 토큰 해제 요청 중 I/O 오류 발생: " + e.getMessage());
        }
    }

    /**
     * 사용자의 Google Calendar 연동 상태 및 토큰 유효성을 확인합니다.
     * @param userId 확인할 사용자의 ID
     * @return 캘린더가 연결되어 있고 토큰이 유효하면 true, 그렇지 않으면 false
     */
    public boolean isCalendarConnected(Long userId) {
        try {
            // 강제 새로고침 조회로 즉시 반영 보장
            User user = userService.findByIdWithRefresh(userId).orElse(null);
            if (user == null) {
                System.err.println("[CalendarService] isConnected=false: 사용자 없음 userId=" + userId);
                return false;
            }
            if (user.getGoogleOAuthId() == null) {
                System.err.println("[CalendarService] isConnected=false: googleOAuthId 없음 userId=" + userId);
                return false;
            }

            String googleOAuthId = user.getGoogleOAuthId();
            System.err.println("[CalendarService] googleOAuthId=" + googleOAuthId + " (userId=" + userId + ")");

            // Redis에서 토큰 정보 가져오기
            Map<String, String> tokenData = getGoogleTokenFromRedis(googleOAuthId);
            if (tokenData == null) {
                System.err.println("[CalendarService] isConnected=false: Redis 키 없음 key=google_token:" + googleOAuthId);
                return false;
            }
            String access = tokenData.get("access_token");
            String refresh = tokenData.get("refresh_token");
            System.err.println("[CalendarService] Redis 토큰 존재 여부: access=" + (access != null) + ", refresh=" + (refresh != null));
            if (access == null) {
                return false;
            }

            // Credential 객체 생성
            Credential credential = createCredential(access, refresh);

            // 가벼운 API 호출로 토큰 유효성 검증
            // CalendarList를 조회하는 것은 비교적 부하가 적고 권한 확인에 적합합니다.
            Calendar service = new Calendar.Builder(GoogleNetHttpTransport.newTrustedTransport(), JSON_FACTORY, credential)
                    .setApplicationName(APPLICATION_NAME).build();
            
            service.events().list("primary").setMaxResults(1).execute();
            
            System.err.println("[CalendarService] isConnected=true: 토큰 유효");
            return true;

        } catch (TokenResponseException e) {
            // Access Token 갱신 실패 (보통 Refresh Token 만료 시 발생)
            System.err.println("[CalendarService] 토큰 갱신 실패: " + e.getDetails().getError());
            return false;
        } catch (IOException | GeneralSecurityException e) {
            // API 호출 실패 (네트워크 오류, 잘못된 토큰 등)
            System.err.println("[CalendarService] 캘린더 연결 상태 확인 중 오류: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Credential 객체를 생성하는 헬퍼 메소드
     */
    private Credential createCredential(String accessToken, String refreshToken) throws GeneralSecurityException, IOException {
        return new Credential.Builder(BearerToken.authorizationHeaderAccessMethod())
                .setTokenServerUrl(new com.google.api.client.http.GenericUrl("https://oauth2.googleapis.com/token"))
                .setClientAuthentication(new ClientParametersAuthentication(clientId, clientSecret))
                .setJsonFactory(JSON_FACTORY)
                .setTransport(GoogleNetHttpTransport.newTrustedTransport())
                .build()
                .setAccessToken(accessToken)
                .setRefreshToken(refreshToken);
    }

    /**
     * 사용자 ID로 Google Calendar 서비스 인스턴스를 반환합니다.
     */
    public Calendar getCalendarServiceByUserId(Long userId) throws IOException, GeneralSecurityException {
        // 사용자 ID로 사용자 정보 가져오기
        User user = userService.findById(userId)
                .orElseThrow(() -> new IOException("사용자를 찾을 수 없습니다."));
        
        if (user.getGoogleOAuthId() == null) {
            throw new IOException("Google Calendar가 연동되지 않았습니다.");
        }

        // Redis에서 Google 토큰 가져오기
        Map<String, String> tokenData = getGoogleTokenFromRedis(user.getGoogleOAuthId());
        if (tokenData == null || tokenData.get("access_token") == null) {
            throw new IOException("Google Calendar 토큰이 없거나 만료되었습니다.");
        }

        String accessToken = tokenData.get("access_token");
        String refreshToken = tokenData.get("refresh_token");

        // Google Credential 생성 (최신 방식)
        Credential credential = createCredential(accessToken, refreshToken);

        // Calendar 서비스 생성
        return new Calendar.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                JSON_FACTORY,
                credential)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    /**
     * 현재 인증된 사용자의 Google Calendar 서비스 인스턴스를 반환합니다.
     * @deprecated JWT 기반 인증에서는 사용자 ID를 직접 전달하는 방식을 사용하세요.
     */
    @Deprecated
    private Calendar getCalendarService() throws IOException, GeneralSecurityException {
        // 현재 인증된 사용자 정보 가져오기
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IOException("인증되지 않은 사용자입니다.");
        }

        String principal = (String) auth.getPrincipal();
        if (principal == null || !principal.contains(":")) {
            throw new IOException("사용자 정보를 찾을 수 없습니다.");
        }

        String[] parts = principal.split(":");
        String provider = parts[0];
        String oauthId = parts[1];
        
        // 사용자 정보에서 Google OAuth ID 가져오기
        User user = userService.findByProviderAndOAuthId(provider, oauthId)
                .orElseThrow(() -> new IOException("사용자를 찾을 수 없습니다."));
        
        if (user.getGoogleOAuthId() == null) {
            throw new IOException("Google Calendar가 연동되지 않았습니다.");
        }

        // Redis에서 Google 토큰 가져오기
        Map<String, String> tokenData = getGoogleTokenFromRedis(user.getGoogleOAuthId());
        if (tokenData == null || tokenData.get("access_token") == null) {
            throw new IOException("Google Calendar 토큰이 없거나 만료되었습니다.");
        }

        String accessToken = tokenData.get("access_token");
        String refreshToken = tokenData.get("refresh_token");

        // Google Credential 생성 (최신 방식)
        Credential credential = createCredential(accessToken, refreshToken);

        // Calendar 서비스 생성
        return new Calendar.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                JSON_FACTORY,
                credential)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    /**
     * Redis에서 Google 토큰 정보를 가져옵니다.
     */
    public Map<String, String> getGoogleTokenFromRedis(String googleOAuthId) {
        String redisKey = "google_token:" + googleOAuthId;
        // Hash 구조로 저장된 토큰 데이터를 조회
        Map<Object, Object> hashData = redisTemplate.opsForHash().entries(redisKey);
        
        if (hashData == null || hashData.isEmpty()) {
            return null;
        }
        
        // Object를 String으로 변환
        Map<String, String> tokenData = new HashMap<>();
        for (Map.Entry<Object, Object> entry : hashData.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                tokenData.put(entry.getKey().toString(), entry.getValue().toString());
            }
        }
        
        return tokenData;
    }

    /**
     * 새로운 이벤트를 생성합니다.
     */
    public Event createEvent(Long userId, String summary, String description, String location, 
                           DateTime startDateTime, DateTime endDateTime, 
                           List<String> attendeeEmails, String recurrence) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarServiceByUserId(userId);

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

        // 반복 규칙 추가
        if (recurrence != null && !recurrence.isEmpty() && !recurrence.equals("NONE")) {
            // Google Calendar API uses RRULE format for recurrence
            // For simplicity, we'll map our simple recurrence types to basic RRULEs
            String rrule = "";
            switch (recurrence) {
                case "DAILY":
                    rrule = "RRULE:FREQ=DAILY";
                    break;
                case "WEEKLY":
                    rrule = "RRULE:FREQ=WEEKLY";
                    break;
                case "MONTHLY":
                    rrule = "RRULE:FREQ=MONTHLY";
                    break;
                default:
                    // No recurrence
                    break;
            }
            if (!rrule.isEmpty()) {
                event.setRecurrence(Arrays.asList(rrule));
            }
        }

        return service.events().insert("primary", event)
                .setSendUpdates("all")
                .execute();
    }

    /**
     * 특정 이벤트를 가져옵니다.
     */
    public Event getEvent(Long userId, String eventId) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarServiceByUserId(userId);
        return service.events().get("primary", eventId).execute();
    }

    /**
     * 이벤트를 업데이트합니다.
     */
    public Event updateEvent(Long userId, String eventId, String summary, String description, String location, 
                           DateTime startDateTime, DateTime endDateTime, 
                           List<String> attendeeEmails, String recurrence) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarServiceByUserId(userId);

        Event existingEvent = service.events().get("primary", eventId).execute();
        if (existingEvent == null) {
            throw new IOException("Event not found.");
        }

        existingEvent.setSummary(summary);
        existingEvent.setDescription(description);
        existingEvent.setLocation(location);

        EventDateTime start = new EventDateTime()
                .setDateTime(startDateTime)
                .setTimeZone("Asia/Seoul");
        existingEvent.setStart(start);

        EventDateTime end = new EventDateTime()
                .setDateTime(endDateTime)
                .setTimeZone("Asia/Seoul");
        existingEvent.setEnd(end);

        // 참석자 업데이트
        if (attendeeEmails != null && !attendeeEmails.isEmpty()) {
            List<EventAttendee> attendees = attendeeEmails.stream()
                    .map(email -> new EventAttendee().setEmail(email))
                    .toList();
            existingEvent.setAttendees(attendees);
        } else {
            existingEvent.setAttendees(null); // Clear attendees if empty list is provided
        }

        // 반복 규칙 업데이트
        if (recurrence != null && !recurrence.isEmpty() && !recurrence.equals("NONE")) {
            String rrule = "";
            switch (recurrence) {
                case "DAILY":
                    rrule = "RRULE:FREQ=DAILY";
                    break;
                case "WEEKLY":
                    rrule = "RRULE:FREQ=WEEKLY";
                    break;
                case "MONTHLY":
                    rrule = "RRULE:FREQ=MONTHLY";
                    break;
                default:
                    // No recurrence
                    break;
            }
            if (!rrule.isEmpty()) {
                existingEvent.setRecurrence(Arrays.asList(rrule));
            }
        } else {
            existingEvent.setRecurrence(null); // Clear recurrence if NONE is provided
        }

        return service.events().update("primary", eventId, existingEvent)
                .setSendUpdates("all")
                .execute();
    }

    /**
     * 이벤트를 삭제합니다.
     */
    public void deleteEvent(Long userId, String eventId) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarServiceByUserId(userId);
        service.events().delete("primary", eventId).execute();
    }

    /**
     * 특정 날짜 범위의 이벤트를 가져옵니다.
     */
    public List<Event> getEventsInRange(Long userId, DateTime startTime, DateTime endTime) throws IOException, GeneralSecurityException {
        Calendar service = getCalendarServiceByUserId(userId);
        
        Events events = service.events().list("primary")
                .setTimeMin(startTime)
                .setTimeMax(endTime)
                .setOrderBy("startTime")
                .setSingleEvents(true)
                .execute();

        return events.getItems();
    }
}
