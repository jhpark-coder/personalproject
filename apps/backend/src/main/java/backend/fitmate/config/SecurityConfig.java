
package backend.fitmate.config;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.util.UriComponentsBuilder;

import backend.fitmate.user.entity.User;
import backend.fitmate.user.repository.UserRepository;
import backend.fitmate.user.service.UserService;
import backend.fitmate.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;
    private final UserService userService;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final OAuth2AuthorizedClientService clientService;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                // 인증이 필요없는 공개 엔드포인트들
                .requestMatchers(
                    "/api/auth/login", 
                    "/api/auth/signup", 
                    "/api/auth/send-verification-email",
                    "/api/auth/verify-email-code",
                    "/api/auth/resend-verification-email",
                    "/api/auth/check-email",
                    "/api/auth/verify-phone",
                    "/api/exercises/**",
                    "/api/exercise-information/**",
                    "/test/**"
                ).permitAll()
                // OAuth2 관련 경로
                .requestMatchers("/oauth2/**", "/login/oauth2/**", "/error").permitAll()
                // 나머지는 모두 인증 필요 (profile, logout, update-* 등)
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
                .successHandler(oAuth2AuthenticationSuccessHandler())
            )
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider, customUserDetailsService, userRepository),
                    UsernamePasswordAuthenticationFilter.class)
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );
        
        return http.build();
    }

    @Bean
    public AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler() {
        return (request, response, authentication) -> {
            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
            String registrationId = ((org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken) authentication)
                    .getAuthorizedClientRegistrationId();

            Map<String, Object> attributes = oAuth2User.getAttributes();
            
            System.err.println("🚀 OAuth2 Success Handler 시작!");
            System.err.println("🚀 Provider: " + registrationId);
            System.err.println("🚀 All attributes: " + attributes);
            
            // 각 제공자별로 데이터 추출
            String email, name, picture, oauthId;
            
            try {
                switch (registrationId) {
                    case "google":
                        email = (String) attributes.get("email");
                        name = (String) attributes.get("name");
                        picture = (String) attributes.get("picture");
                        oauthId = (String) attributes.get("sub");
                        System.err.println("🚀 Google - email: " + email + ", name: " + name + ", oauthId: " + oauthId);
                        break;
                    case "naver":
                        // CustomOAuth2UserService에서 이미 평탄화되어 직접 접근 가능
                        email = (String) attributes.get("email");
                        name = (String) attributes.get("name");
                        picture = (String) attributes.get("profile_image");  // 네이버는 profile_image 필드명 확인 필요
                        oauthId = (String) attributes.get("id");
                        System.err.println("🚀 Naver - email: " + email + ", name: " + name + ", picture: " + picture + ", oauthId: " + oauthId);
                        
                        // picture가 null이면 다른 필드명들을 시도
                        if (picture == null) {
                            picture = (String) attributes.get("profile_image_url");
                            System.err.println("🚀 Naver - profile_image_url 시도: " + picture);
                        }
                        if (picture == null) {
                            picture = ""; // 기본값 설정
                            System.err.println("🚀 Naver - picture를 빈 문자열로 설정");
                        }
                        break;
                    case "kakao":
                        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
                        Map<String, Object> kakaoProfile = (Map<String, Object>) kakaoAccount.get("profile");
                        email = (String) kakaoAccount.get("email");
                        name = (String) kakaoProfile.get("nickname");
                        picture = (String) kakaoProfile.get("profile_image_url");
                        oauthId = attributes.get("id").toString();
                        System.err.println("🚀 Kakao - email: " + email + ", name: " + name + ", oauthId: " + oauthId);
                        break;
                    default:
                        throw new RuntimeException("지원하지 않는 OAuth2 제공자입니다: " + registrationId);
                }

                // 캘린더 연동 요청인지 확인 (Redis에서 Google OAuth ID로)
                boolean isCalendarRequest = false;
                Long calendarLinkingUserId = null;
                
                try {
                    // 모든 활성 캘린더 연동 요청 확인 (Google 계정이면 무조건 연동)
                    java.util.Set<String> keys = redisTemplate.keys("calendar_linking_user:*");
                    if (keys != null && !keys.isEmpty() && "google".equals(registrationId)) {
                        // Google OAuth2이고 활성 캘린더 연동 요청이 있으면 첫 번째 것으로 연동
                        String firstKey = keys.iterator().next();
                        String storedUserId = (String) redisTemplate.opsForValue().get(firstKey);
                        if (storedUserId != null) {
                            try {
                                Long userId = Long.parseLong(storedUserId);
                                User user = userRepository.findById(userId).orElse(null);
                                if (user != null) {
                                    isCalendarRequest = true;
                                    calendarLinkingUserId = userId;
                                    redisTemplate.delete(firstKey); // 사용 후 삭제
                                    System.err.println("🚀 Redis에서 캘린더 연동 감지! 사용자 ID: " + userId + ", Google 이메일: " + email);
                                } else {
                                    System.err.println("🚨 사용자를 찾을 수 없음: " + userId);
                                }
                            } catch (NumberFormatException e) {
                                System.err.println("🚨 잘못된 사용자 ID 형식: " + storedUserId);
                            }
                        }
                    }
                    
                    if (!isCalendarRequest) {
                        System.err.println("🚀 Redis에 캘린더 연동 정보 없음 또는 Google이 아님 (provider: " + registrationId + ", 이메일: " + email + ")");
                    }
                } catch (Exception e) {
                    System.err.println("🚨 Redis 캘린더 연동 정보 조회 실패: " + e.getMessage());
                }

                System.err.println("🚀 사용자 정보 저장 시작...");
                System.err.println("🚀 캘린더 연동 요청: " + isCalendarRequest);
                
                User user;
                boolean isNewUser = false;
                
                if (isCalendarRequest && "google".equals(registrationId) && calendarLinkingUserId != null) {
                    // 캘린더 연동: 기존 사용자에 Google 정보만 추가
                    user = userService.addGoogleCalendarInfoByUserId(calendarLinkingUserId, email, name, picture, oauthId);
                    isNewUser = false; // 캘린더 연동은 항상 기존 사용자
                } else {
                    // 일반 OAuth2 로그인
                    user = userService.saveOrUpdateOAuth2User(email, name, picture, registrationId, oauthId);
                    isNewUser = user.getCreatedAt().isAfter(java.time.LocalDateTime.now().minusSeconds(5));
                }
                
                System.err.println("🚀 사용자 저장 완료: " + user.getId() + ", isNewUser: " + isNewUser);

                // 캘린더 연동인 경우 Google OAuth2 토큰을 Redis에 저장
                if (isCalendarRequest && "google".equals(registrationId) && user.getGoogleOAuthId() != null) {
                    try {
                        OAuth2AuthorizedClient client = clientService.loadAuthorizedClient("google", oauthId);
                        if (client != null) {
                            String accessToken = client.getAccessToken().getTokenValue();
                            String refreshToken = client.getRefreshToken() != null ? client.getRefreshToken().getTokenValue() : null;
                            
                            // Redis에 Google 토큰 저장
                            String key = "google_token:" + user.getGoogleOAuthId();
                            Map<String, String> tokenData = new HashMap<>();
                            tokenData.put("access_token", accessToken);
                            if (refreshToken != null) {
                                tokenData.put("refresh_token", refreshToken);
                            }
                            tokenData.put("timestamp", String.valueOf(System.currentTimeMillis()));
                            
                            redisTemplate.opsForHash().putAll(key, tokenData);
                            redisTemplate.expire(key, 3600, TimeUnit.SECONDS); // 1시간 TTL
                            
                            System.err.println("🚀 Google 토큰 Redis 저장 완료: " + user.getGoogleOAuthId());
                        } else {
                            System.err.println("🚨 OAuth2 클라이언트를 찾을 수 없음: " + oauthId);
                        }
                    } catch (Exception e) {
                        System.err.println("🚨 Google 토큰 Redis 저장 실패: " + e.getMessage());
                    }
                }

                System.err.println("🚀 JWT 토큰 생성 시작...");
                String token = jwtTokenProvider.createToken(user.getId(), user.getEmail(), user.getName(),
                        user.getOauthProvider(), user.getOauthId(), user.getProfileImage(), user.getRole());
                System.err.println("🚀 JWT 토큰 생성 완료: " + (token != null ? "성공" : "실패"));

                String frontendBase = System.getProperty("app.frontend.url");
                if (frontendBase == null || frontendBase.isBlank()) {
                    frontendBase = System.getenv().getOrDefault("APP_FRONTEND_URL", "http://localhost:5173");
                }

                // 프록시 뒤에서 동작 시 외부 기준의 프로토콜/호스트를 우선 사용
                try {
                    String forwardedProto = request.getHeader("X-Forwarded-Proto");
                    String forwardedHost = request.getHeader("X-Forwarded-Host");
                    // Nginx가 X-Forwarded-Host를 보내지 않는 경우 Host 헤더를 사용
                    if (forwardedHost == null || forwardedHost.isBlank()) {
                        forwardedHost = request.getHeader("Host");
                    }
                    if (forwardedHost != null && !forwardedHost.isBlank()) {
                        String scheme = (forwardedProto != null && !forwardedProto.isBlank()) ? forwardedProto : request.getScheme();
                        String base = scheme + "://" + forwardedHost;
                        // HashRouter 경로 포함
                        frontendBase = base.replaceAll("/$", "");
                    }
                } catch (Exception ignored) {}
 
                String targetUrl = UriComponentsBuilder.fromUriString(frontendBase + "/#/auth/callback")
                        .queryParam("success", "true")
                        .queryParam("token", token)
                        .queryParam("provider", user.getOauthProvider())
                        .queryParam("email", user.getEmail())
                        .queryParam("name", user.getName())
                        .queryParam("isNewUser", String.valueOf(isNewUser))
                        .queryParam("picture", user.getProfileImage())
                        .build()
                        .encode(StandardCharsets.UTF_8)
                        .toUriString();

                System.err.println("🚀 리다이렉트 URL: " + targetUrl);

                response.sendRedirect(targetUrl);
                System.err.println("🚀 리다이렉트 완료!");
                
            } catch (Exception e) {
                System.err.println("🚨 OAuth2 Success Handler 에러: " + e.getMessage());
                e.printStackTrace();
                throw e;
            }
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // 프로덕션과 개발 환경별 허용 도메인 구분
        configuration.setAllowedOriginPatterns(Arrays.asList(
            // Development environments
            "http://localhost:5173",
            "https://localhost:5173", 
            "http://192.168.50.28:5173",
            // Production domain (environment variable로 관리 권장)
            "https://www.fitmate.com",
            // Development tunnel services (개발용만)
            "https://*.loca.lt",
            "https://*.ngrok.io",
            "https://*.trycloudflare.com"
        ));
        // HTTP 메서드 제한 (필요한 것만)
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        // 헤더 제한 (보안 강화)
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"
        ));
        // 노출할 헤더 제한
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        // Pre-flight 요청 캐시 시간 설정 (성능 향상)
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
} 