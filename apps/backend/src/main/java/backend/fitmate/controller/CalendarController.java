package backend.fitmate.controller;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
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

import backend.fitmate.user.entity.User;
import backend.fitmate.user.service.UserService;
import backend.fitmate.service.CalendarService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/calendar")
@CrossOrigin(origins = "${app.frontend.url}", allowCredentials = "true")
@RequiredArgsConstructor
public class CalendarController {

    private final UserService userService;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${app.backend.url}")
    private String backendUrl;

    private final CalendarService calendarService;

    /**
     * 간단한 테스트 엔드포인트
     */
    @GetMapping("/ping")
    public ResponseEntity<?> ping() {
        System.out.println("=== CalendarController.ping() 호출됨 ===");
        return ResponseEntity.ok(Map.of("message", "CalendarController ping 성공", "timestamp", System.currentTimeMillis()));
    }

    /**
     * Google Calendar 인증을 시작합니다.
     */
    @GetMapping("/auth/google")
    public ResponseEntity<?> startGoogleAuth(HttpServletRequest request) {
        System.out.println("=== 캘린더 연동 요청 받음 ===");
        try {
            Long userId = getUserIdFromAuthentication(SecurityContextHolder.getContext().getAuthentication());
            System.out.println("인증된 사용자 ID: " + userId);

            // Redis에 캘린더 연동 정보 저장 (사용자 ID 기반)
            String calendarLinkingKey = "calendar_linking_user:" + userId;
            redisTemplate.opsForValue().set(calendarLinkingKey, userId.toString(), 300, java.util.concurrent.TimeUnit.SECONDS);
            System.out.println("Redis에 캘린더 연동 플래그 저장: userId=" + userId);

            // Google OAuth2 인증 URL 생성 (캘린더 연동용)
            // 외부 접근 기준의 베이스 URL을 요청 헤더로부터 우선 계산하고, 실패 시 app.backend.url 사용
            String externalBaseUrl = resolveExternalBaseUrl(request);
            String authUrl = UriComponentsBuilder.fromHttpUrl(externalBaseUrl)
                    .path("/oauth2/authorization/google")
                    .queryParam("user_id", userId)
                    .queryParam("calendar_only", "true") // 캘린더 연동임을 표시
                    .toUriString();

            System.out.println("생성된 인증 URL: " + authUrl);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Google 인증을 시작합니다.");
            response.put("authUrl", authUrl);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("캘린더 연동 시작 중 오류: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "인증 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    private Long getUserIdFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InsufficientAuthenticationException("인증되지 않은 사용자입니다.");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails) {
            String username = ((UserDetails) principal).getUsername();
            // UserDetails의 username이 실제 DB의 ID라고 가정
            return Long.parseLong(username);
        } else if (principal instanceof String) {
            // OAuth2 로그인 시 principal은 provider:oauthId 형태일 수 있음
            String principalStr = (String) principal;
            if (principalStr.contains(":")) {
                String[] parts = principalStr.split(":");
                String provider = parts[0];
                String oauthId = parts[1];
                
                System.out.println("=== OAuth2 사용자 검색 ===");
                System.out.println("Provider: " + provider);
                System.out.println("OAuthId: " + oauthId);
                
                return userService.findByProviderAndOAuthId(provider, oauthId)
                        .map(User::getId)
                        .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + principalStr));
            }
        }
        throw new UsernameNotFoundException("사용자 ID를 추출할 수 없습니다: " + principal);
    }

    // 요청 헤더 기반으로 외부 기준의 베이스 URL을 계산합니다.
    // X-Forwarded-Proto / X-Forwarded-Host가 존재하면 이를 사용하고, 없으면 Host/기본 서버 정보를 사용합니다.
    // 모두 없으면 설정값(app.backend.url)로 폴백합니다.
    private String resolveExternalBaseUrl(HttpServletRequest request) {
        try {
            String proto = firstNonBlank(
                request.getHeader("X-Forwarded-Proto"),
                request.getScheme()
            );
            String host = firstNonBlank(
                request.getHeader("X-Forwarded-Host"),
                request.getHeader("Host"),
                request.getServerName()
            );

            if (proto != null && host != null && !host.isBlank()) {
                return proto + "://" + host;
            }
        } catch (Exception ignored) {}
        return backendUrl; // 최종 폴백
    }

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    /**
     * 브라우저가 직접 방문할 수 있는 구글 인증 시작 엔드포인트
     */
    @GetMapping("/start-google-auth")
    public void startGoogleAuthDirect(HttpServletRequest request, HttpServletResponse response) throws IOException {
        System.out.println("=== 직접 구글 인증 시작 ===");
        
        // 현재 로그인한 사용자 정보를 state에 포함
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUserInfo = "";
        
        if (auth != null && auth.getPrincipal() instanceof String) {
            String principal = (String) auth.getPrincipal();
            if (principal.contains(":")) {
                currentUserInfo = "&current_user=" + java.net.URLEncoder.encode(principal, java.nio.charset.StandardCharsets.UTF_8);
                System.out.println("현재 사용자 정보: " + principal);
            }
        }
        
        // 세션에 캘린더 연동 정보 저장
        HttpSession session = request.getSession(true);
        session.setAttribute("calendar_link_info", currentUserInfo);
        System.out.println("세션에 캘린더 연동 정보 저장: " + currentUserInfo);
        
        // 단순한 state 파라미터 사용
        String authUrl = backendUrl + "/oauth2/authorization/google";
        
        System.out.println("직접 리다이렉트: " + authUrl);
        response.sendRedirect(authUrl);
    }

    /**
     * 네이버 사용자에게 구글 정보를 직접 추가하는 엔드포인트 (테스트용)
     */
    @PostMapping("/link-google-to-naver")
    public ResponseEntity<?> linkGoogleToNaver(@RequestBody Map<String, Object> requestBody) {
        try {
            String googleOauthId = (String) requestBody.get("googleOauthId");
            String googleEmail = (String) requestBody.get("googleEmail");
            String googleName = (String) requestBody.get("googleName");
            String googlePicture = (String) requestBody.get("googlePicture");
            
            // 네이버 사용자 ID 1번 찾기
            User naverUser = userService.findById(1L).orElse(null);
            
            if (naverUser != null) {
                // 네이버 사용자에게 구글 정보 추가
                naverUser.setGoogleOAuthId(googleOauthId);
                naverUser.setGoogleEmail(googleEmail);
                naverUser.setGoogleName(googleName);
                if (googlePicture != null) {
                    naverUser.setGooglePicture(googlePicture);
                }
                userService.save(naverUser);
                
                System.out.println("네이버 사용자에게 구글 정보 추가 완료: " + naverUser.getId());
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "네이버 사용자에게 구글 캘린더가 연동되었습니다.",
                    "userId", naverUser.getId()
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "네이버 사용자를 찾을 수 없습니다."
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "구글 캘린더 연동 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }

    /**
     * 구글 캘린더 연동을 위한 별도 처리 엔드포인트
     */
    @PostMapping("/link-google")
    public ResponseEntity<?> linkGoogleCalendar(@RequestBody Map<String, Object> requestBody) {
        try {
            String accessToken = (String) requestBody.get("accessToken");
            String email = (String) requestBody.get("email");
            String name = (String) requestBody.get("name");
            String picture = (String) requestBody.get("picture");
            String oauthId = (String) requestBody.get("oauthId");
            
            // 현재 로그인된 사용자 찾기
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            User currentUser = null;
            
            if (auth != null && auth.getPrincipal() instanceof String) {
                String principal = (String) auth.getPrincipal();
                if (principal.contains(":")) {
                    String[] parts = principal.split(":");
                    if (parts.length >= 2) {
                        String currentProvider = parts[0];
                        String currentOauthId = parts[1];
                        currentUser = userService.findByOAuth2ProviderAndOAuth2Id(currentProvider, currentOauthId).orElse(null);
                    }
                }
            }
            
            if (currentUser != null) {
                // 기존 사용자에게 구글 정보 추가
                currentUser.setGoogleOAuthId(oauthId);
                currentUser.setGoogleEmail(email);
                currentUser.setGoogleName(name);
                if (picture != null) {
                    currentUser.setGooglePicture(picture);
                }
                userService.save(currentUser);
                
                System.out.println("기존 사용자에게 구글 캘린더 연동 완료: " + currentUser.getId());
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "구글 캘린더가 성공적으로 연동되었습니다.",
                    "userId", currentUser.getId()
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "로그인된 사용자를 찾을 수 없습니다."
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "캘린더 연동 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }

    /**
     * OAuth2 인증이 되어 있는지 확인합니다.
     */
    private boolean isAuthenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // OAuth2AuthenticationToken 확인
        if (authentication instanceof OAuth2AuthenticationToken) {
            return true;
        }
        
        // 일반 JWT 토큰 확인 (UsernamePasswordAuthenticationToken)
        if (authentication instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken) {
            Object principal = authentication.getPrincipal();
            // principal이 String이고 provider:oauthId 형식인 경우 (OAuth2 사용자)
            if (principal instanceof String && ((String) principal).contains(":")) {
                return true;
            }
            // principal이 UserDetails인 경우 (로컬 사용자)
            if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 다가오는 이벤트 목록을 가져옵니다.
     */
    @GetMapping("/events")
    public ResponseEntity<?> getUpcomingEvents(@RequestParam(defaultValue = "10") int maxResults) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "OAuth2 인증이 필요합니다."));
        }

        try {
            List<Event> events = calendarService.getUpcomingEvents(maxResults);
            
            // Google Calendar Event를 프론트엔드 친화적 형태로 변환
            List<Map<String, Object>> formattedEvents = events.stream().map(event -> {
                Map<String, Object> formattedEvent = new HashMap<>();
                
                formattedEvent.put("id", event.getId());
                formattedEvent.put("title", event.getSummary() != null ? event.getSummary() : "제목 없음");
                formattedEvent.put("description", event.getDescription());
                formattedEvent.put("location", event.getLocation());
                formattedEvent.put("htmlLink", event.getHtmlLink());
                
                // 날짜 형식 통일 (ISO 8601 형식으로)
                String startDate = formatEventDateTime(event.getStart());
                String endDate = formatEventDateTime(event.getEnd());
                
                formattedEvent.put("startDate", startDate);
                formattedEvent.put("endDate", endDate);
                
                // All-day 이벤트 여부 확인
                boolean isAllDay = (event.getStart().getDateTime() == null);
                formattedEvent.put("isAllDay", isAllDay);
                
                // 생성자 정보
                if (event.getCreator() != null) {
                    formattedEvent.put("creator", Map.of(
                        "email", event.getCreator().getEmail() != null ? event.getCreator().getEmail() : "",
                        "displayName", event.getCreator().getDisplayName() != null ? event.getCreator().getDisplayName() : ""
                    ));
                }
                
                // 생성 시간
                formattedEvent.put("created", event.getCreated() != null ? event.getCreated().toString() : null);
                
                return formattedEvent;
            }).toList();
            
            return ResponseEntity.ok(formattedEvents);
        } catch (IOException | GeneralSecurityException e) {
            System.err.println("CalendarController 오류: " + e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "캘린더 이벤트를 가져오는 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
    
    /**
     * Google Calendar EventDateTime을 통일된 형식으로 변환
     */
    private String formatEventDateTime(com.google.api.services.calendar.model.EventDateTime eventDateTime) {
        if (eventDateTime == null) {
            return null;
        }
        
        // 시간 지정 이벤트인 경우
        if (eventDateTime.getDateTime() != null) {
            return eventDateTime.getDateTime().toString(); // ISO 8601 형식
        }
        
        // All-day 이벤트인 경우 (날짜만 있음)
        if (eventDateTime.getDate() != null) {
            return eventDateTime.getDate().toString(); // YYYY-MM-DD 형식
        }
        
        return null;
    }

    /**
     * 새로운 이벤트를 생성합니다.
     */
    @PostMapping("/events")
    public ResponseEntity<?> createEvent(@RequestBody Map<String, Object> eventData) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "OAuth2 인증이 필요합니다."));
        }

        try {
            String summary = (String) eventData.get("summary");
            String description = (String) eventData.get("description");
            String location = (String) eventData.get("location");
            String startDateTimeStr = (String) eventData.get("startDateTime");
            String endDateTimeStr = (String) eventData.get("endDateTime");
            
            @SuppressWarnings("unchecked")
            List<String> attendeeEmails = (List<String>) eventData.get("attendeeEmails");

            // DateTime 객체 생성
            DateTime startDateTime = new DateTime(startDateTimeStr);
            DateTime endDateTime = new DateTime(endDateTimeStr);

            Event createdEvent = calendarService.createEvent(summary, description, location, 
                    startDateTime, endDateTime, attendeeEmails);
            
            return ResponseEntity.ok(createdEvent);
        } catch (IOException | GeneralSecurityException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "이벤트 생성 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 특정 이벤트를 가져옵니다.
     */
    @GetMapping("/events/{eventId}")
    public ResponseEntity<?> getEvent(@PathVariable String eventId) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "OAuth2 인증이 필요합니다."));
        }

        try {
            Event event = calendarService.getEvent(eventId);
            return ResponseEntity.ok(event);
        } catch (IOException | GeneralSecurityException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "이벤트를 가져오는 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 이벤트를 업데이트합니다.
     */
    @PutMapping("/events/{eventId}")
    public ResponseEntity<?> updateEvent(@PathVariable String eventId, @RequestBody Event updatedEvent) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "OAuth2 인증이 필요합니다."));
        }

        try {
            Event event = calendarService.updateEvent(eventId, updatedEvent);
            return ResponseEntity.ok(event);
        } catch (IOException | GeneralSecurityException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "이벤트 업데이트 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 이벤트를 삭제합니다.
     */
    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<?> deleteEvent(@PathVariable String eventId) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "OAuth2 인증이 필요합니다."));
        }

        try {
            calendarService.deleteEvent(eventId);
            return ResponseEntity.ok(Map.of("message", "이벤트가 성공적으로 삭제되었습니다."));
        } catch (IOException | GeneralSecurityException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "이벤트 삭제 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 특정 날짜 범위의 이벤트를 가져옵니다.
     */
    @GetMapping("/events/range")
    public ResponseEntity<?> getEventsInRange(@RequestParam String startTime, 
                                            @RequestParam String endTime) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "OAuth2 인증이 필요합니다."));
        }

        try {
            DateTime startDateTime = new DateTime(startTime);
            DateTime endDateTime = new DateTime(endTime);
            
            List<Event> events = calendarService.getEventsInRange(startDateTime, endDateTime);
            
            // Google Calendar Event를 프론트엔드 친화적 형태로 변환
            List<Map<String, Object>> formattedEvents = events.stream().map(event -> {
                Map<String, Object> formattedEvent = new HashMap<>();
                
                formattedEvent.put("id", event.getId());
                formattedEvent.put("title", event.getSummary() != null ? event.getSummary() : "제목 없음");
                formattedEvent.put("description", event.getDescription());
                formattedEvent.put("location", event.getLocation());
                formattedEvent.put("htmlLink", event.getHtmlLink());
                
                // 날짜 형식 통일
                String startDate = formatEventDateTime(event.getStart());
                String endDate = formatEventDateTime(event.getEnd());
                
                formattedEvent.put("startDate", startDate);
                formattedEvent.put("endDate", endDate);
                
                // All-day 이벤트 여부 확인
                boolean isAllDay = (event.getStart().getDateTime() == null);
                formattedEvent.put("isAllDay", isAllDay);
                
                // 생성자 정보
                if (event.getCreator() != null) {
                    formattedEvent.put("creator", Map.of(
                        "email", event.getCreator().getEmail() != null ? event.getCreator().getEmail() : "",
                        "displayName", event.getCreator().getDisplayName() != null ? event.getCreator().getDisplayName() : ""
                    ));
                }
                
                // 생성 시간
                formattedEvent.put("created", event.getCreated() != null ? event.getCreated().toString() : null);
                
                return formattedEvent;
            }).toList();
            
            return ResponseEntity.ok(formattedEvents);
        } catch (IOException | GeneralSecurityException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "날짜 범위 이벤트를 가져오는 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 운동 일정을 캘린더에 추가합니다.
     */
    @PostMapping("/workout")
    public ResponseEntity<?> createWorkoutEvent(@RequestBody Map<String, Object> workoutData) {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "OAuth2 인증이 필요합니다."));
        }

        try {
            String workoutName = (String) workoutData.get("name");
            String description = (String) workoutData.get("description");
            String location = (String) workoutData.get("location");
            String startTime = (String) workoutData.get("startTime");
            String endTime = (String) workoutData.get("endTime");
            
            @SuppressWarnings("unchecked")
            List<String> attendeeEmails = (List<String>) workoutData.get("attendeeEmails");

            // 운동 일정용 요약 생성
            String summary = "🏋️ " + workoutName + " 운동";

            DateTime startDateTime = new DateTime(startTime);
            DateTime endDateTime = new DateTime(endTime);

            Event createdEvent = calendarService.createEvent(summary, description, location, 
                    startDateTime, endDateTime, attendeeEmails);
            
            return ResponseEntity.ok(createdEvent);
        } catch (IOException | GeneralSecurityException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "운동 일정 생성 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 캘린더 연결 상태를 확인합니다.
     */
    @GetMapping("/status")
    public ResponseEntity<?> getCalendarStatus() {
        if (!isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "OAuth2 인증이 필요합니다."));
        }

        try {
            // 간단한 테스트로 캘린더 서비스가 정상 작동하는지 확인
            List<Event> events = calendarService.getUpcomingEvents(1);
            return ResponseEntity.ok(Map.of(
                "connected", true,
                "provider", "google",
                "message", "캘린더가 정상적으로 연결되어 있습니다."
            ));
        } catch (IOException | GeneralSecurityException e) {
            return ResponseEntity.ok(Map.of(
                "connected", false,
                "provider", "google",
                "message", "캘린더 연결에 실패했습니다: " + e.getMessage()
            ));
        }
    }
} 