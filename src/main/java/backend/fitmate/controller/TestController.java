package backend.fitmate.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.config.RateLimit;

@RestController
@RequestMapping("/test")
@CrossOrigin(origins = "*")
public class TestController {

    // 테스트용 로그인 엔드포인트 (분당 5회 제한)
    @PostMapping("/login")
    @RateLimit(bucketName = "loginBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> testLogin() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "로그인 테스트 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    // 테스트용 회원가입 엔드포인트 (분당 3회 제한)
    @PostMapping("/signup")
    @RateLimit(bucketName = "signupBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> testSignup() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "회원가입 테스트 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    // 테스트용 이메일 인증 엔드포인트 (분당 2회 제한)
    @PostMapping("/email-verification")
    @RateLimit(bucketName = "emailVerificationBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> testEmailVerification() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "이메일 인증 테스트 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    // 테스트용 OAuth2 엔드포인트 (분당 10회 제한)
    @PostMapping("/oauth2")
    @RateLimit(bucketName = "oauth2Bucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> testOAuth2() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "OAuth2 테스트 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    // Rate Limiting 테스트용 간단한 GET 엔드포인트
    @GetMapping("/rate-limit-test")
    @RateLimit(bucketName = "loginBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> rateLimitTest() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Rate Limiting 테스트 성공 - 분당 5회 제한");
        response.put("timestamp", System.currentTimeMillis());
        response.put("remainingRequests", "확인하려면 브라우저에서 반복 접속해보세요");
        return ResponseEntity.ok(response);
    }

    // Rate Limiting 상태 확인용 엔드포인트 (제한 없음)
    @GetMapping("/status")
    public ResponseEntity<?> status() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "서버 정상 동작 중");
        response.put("rateLimiting", "활성화됨");
        response.put("testEndpoints", Map.of(
            "login", "POST /test/login (분당 5회)",
            "signup", "POST /test/signup (분당 3회)", 
            "email", "POST /test/email-verification (분당 2회)",
            "oauth2", "POST /test/oauth2 (분당 10회)",
            "test", "GET /test/rate-limit-test (분당 5회)",
            "loginPage", "GET /test/login-page (분당 10회)"
        ));
        return ResponseEntity.ok(response);
    }

    // 로그인 페이지 접근 테스트 (분당 10회 제한)
    @GetMapping("/login-page")
    @RateLimit(bucketName = "loginPageBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> loginPageTest() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "로그인 페이지 접근 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        response.put("remainingRequests", "분당 10회 제한");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/calendar-info")
    public Map<String, Object> getCalendarInfo() {
        return Map.of(
            "message", "Google Calendar API가 설정되었습니다.",
            "endpoints", Map.of(
                "getEvents", "GET /api/calendar/events",
                "createEvent", "POST /api/calendar/events",
                "getEvent", "GET /api/calendar/events/{eventId}",
                "updateEvent", "PUT /api/calendar/events/{eventId}",
                "deleteEvent", "DELETE /api/calendar/events/{eventId}",
                "getEventsInRange", "GET /api/calendar/events/range?startTime={startTime}&endTime={endTime}",
                "createWorkoutEvent", "POST /api/calendar/workout",
                "getStatus", "GET /api/calendar/status"
            ),
            "requirements", "OAuth2 인증이 필요합니다. Google 로그인 후 사용 가능합니다."
        );
    }


} 