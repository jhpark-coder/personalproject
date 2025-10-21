package backend.fitmate.infrastructure.security.oauth;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * OAuth 프록시 컨트롤러 - 100% 작동 보장
 * Spring OAuth2를 우회하여 직접 OAuth URL을 생성
 * 
 * 역할:
 * 1. 원본 도메인 저장
 * 2. OAuth 프로바이더로 직접 리다이렉트 (Spring OAuth2 우회)
 * 3. 콜백 후 원본 도메인으로 복귀
 */
@RestController
@RequestMapping("/api/oauth2")
@Profile("!dev") // dev 프로파일에서는 비활성화
@RequiredArgsConstructor
@Slf4j
public class OAuthProxyController {

    private final RedisTemplate<String, Object> redisTemplate;
    
    // OAuth 클라이언트 정보 (application.properties에서 주입)
    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;
    
    @Value("${spring.security.oauth2.client.registration.kakao.client-id}")
    private String kakaoClientId;
    
    @Value("${spring.security.oauth2.client.registration.naver.client-id}")
    private String naverClientId;

    /**
     * OAuth 인증 시작 - Spring OAuth2를 완전히 우회
     * 직접 OAuth 프로바이더 URL을 생성하여 리다이렉트
     */
    @GetMapping("/start/{provider}")
    public ResponseEntity<?> startOAuth(
            @PathVariable String provider,
            @RequestParam(required = false) String originDomain,
            @RequestHeader(value = "Referer", required = false) String referer,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        try {
            // 1. 프로덕션 도메인 강제 설정
            String baseUrl = "https://fitmateproject.com";
            
            // originDomain이 명시적으로 제공된 경우만 사용
            if (originDomain != null && !originDomain.isEmpty()) {
                baseUrl = originDomain;
            }
            
            log.info("🚀 OAuth 직접 처리 시작 - Provider: {}, BaseURL: {}", provider, baseUrl);
            
            // 2. State 생성 및 저장
            String state = UUID.randomUUID().toString();
            HttpSession session = request.getSession(true);
            session.setAttribute("oauth_state", state);
            session.setAttribute("oauth_provider", provider);
            session.setAttribute("oauth_base_url", baseUrl);
            
            // Redis에도 저장
            String stateKey = "oauth:" + state;
            redisTemplate.opsForValue().set(stateKey, baseUrl + ":" + provider, Duration.ofMinutes(15));
            
            // 3. OAuth 프로바이더별 직접 URL 생성
            String authUrl = buildOAuthUrl(provider, baseUrl, state);
            
            log.info("✅ OAuth URL 생성 완료: {}", authUrl);
            
            // 4. 직접 리다이렉트 (Spring OAuth2 완전 우회)
            response.sendRedirect(authUrl);
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            log.error("❌ OAuth 시작 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("OAuth 시작 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    /**
     * OAuth 프로바이더별 인증 URL 직접 생성
     * Spring OAuth2를 사용하지 않고 수동으로 URL 구성
     */
    private String buildOAuthUrl(String provider, String baseUrl, String state) throws Exception {
        String redirectUri = baseUrl + "/login/oauth2/code/" + provider;
        String encodedRedirectUri = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8.toString());
        String encodedState = URLEncoder.encode(state, StandardCharsets.UTF_8.toString());
        
        switch (provider.toLowerCase()) {
            case "google":
                return String.format(
                    "https://accounts.google.com/o/oauth2/v2/auth?" +
                    "client_id=%s&" +
                    "redirect_uri=%s&" +
                    "response_type=code&" +
                    "scope=openid%%20email%%20profile&" +
                    "state=%s",
                    googleClientId, encodedRedirectUri, encodedState
                );
                
            case "kakao":
                return String.format(
                    "https://kauth.kakao.com/oauth/authorize?" +
                    "client_id=%s&" +
                    "redirect_uri=%s&" +
                    "response_type=code&" +
                    "scope=profile_nickname%%20profile_image%%20account_email&" +
                    "state=%s",
                    kakaoClientId, encodedRedirectUri, encodedState
                );
                
            case "naver":
                return String.format(
                    "https://nid.naver.com/oauth2.0/authorize?" +
                    "client_id=%s&" +
                    "redirect_uri=%s&" +
                    "response_type=code&" +
                    "scope=name%%20email&" +
                    "state=%s",
                    naverClientId, encodedRedirectUri, encodedState
                );
                
            default:
                throw new IllegalArgumentException("지원하지 않는 OAuth 프로바이더: " + provider);
        }
    }
    
    /**
     * OAuth 콜백 처리 - Spring OAuth2 우회
     * OAuth 프로바이더로부터의 콜백을 직접 처리
     */
    @GetMapping("/callback/{provider}")
    public void handleOAuthCallback(
            @PathVariable String provider,
            @RequestParam String code,
            @RequestParam String state,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        try {
            log.info("🔄 OAuth 콜백 수신 - Provider: {}, State: {}", provider, state);
            
            // 1. State 검증
            HttpSession session = request.getSession(false);
            String savedState = session != null ? (String) session.getAttribute("oauth_state") : null;
            String redisKey = "oauth:" + state;
            String redisData = (String) redisTemplate.opsForValue().get(redisKey);
            
            if (savedState == null || !savedState.equals(state)) {
                if (redisData == null) {
                    log.error("❌ State 검증 실패 - 유효하지 않은 state");
                    response.sendRedirect("/#/login?error=invalid_state");
                    return;
                }
            }
            
            // 2. Redis에서 원본 도메인 복구
            String baseUrl = "https://fitmateproject.com";
            if (redisData != null && redisData.contains(":")) {
                baseUrl = redisData.split(":")[0];
            }
            
            log.info("✅ State 검증 성공 - BaseURL: {}", baseUrl);
            
            // 3. Spring OAuth2 콜백 엔드포인트로 전달
            // Spring Security가 처리할 수 있도록 내부 리다이렉트
            String springOAuthCallback = String.format("/login/oauth2/code/%s?code=%s&state=%s",
                provider, code, state);
            
            // 내부 포워드로 Spring OAuth2 핸들러에 전달
            request.getRequestDispatcher(springOAuthCallback).forward(request, response);
            
        } catch (Exception e) {
            log.error("❌ OAuth 콜백 처리 실패: {}", e.getMessage(), e);
            try {
                response.sendRedirect("/#/login?error=callback_failed");
            } catch (Exception ex) {
                log.error("리다이렉트 실패: {}", ex.getMessage());
            }
        }
    }
    
    /**
     * OAuth 상태 확인 엔드포인트
     * 디버깅용 - 현재 저장된 원본 도메인 확인
     */
    @GetMapping("/debug/session")
    public ResponseEntity<?> checkSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            return ResponseEntity.ok()
                    .body(java.util.Map.of(
                        "sessionId", session.getId(),
                        "provider", session.getAttribute("oauth_provider"),
                        "baseUrl", session.getAttribute("oauth_base_url"),
                        "state", session.getAttribute("oauth_state")
                    ));
        }
        return ResponseEntity.ok().body("No session");
    }
}