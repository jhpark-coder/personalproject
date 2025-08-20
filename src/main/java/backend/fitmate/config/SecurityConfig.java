package backend.fitmate.config;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.util.UriComponentsBuilder;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.repository.UserRepository;
import backend.fitmate.User.service.UserService;
import backend.fitmate.service.CustomUserDetailsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
    private final OAuth2AuthorizedClientService authorizedClientService;
    private final OAuth2AuthorizedClientRepository authorizedClientRepository;
    private final ClientRegistrationRepository clientRegistrationRepository;
    private final CustomOidcUserService customOidcUserService;

    // ⭐ 2. 일반 로그인/가입 및 나머지 모든 요청에 대한 보안 설정
    @Bean
    @Order(2)
    public SecurityFilterChain defaultFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/login", "/api/auth/signup", // ... 등등 기존 permitAll 경로들
                    "/api/auth/send-verification-email",
                    "/api/auth/verify-email-code",
                    "/api/auth/resend-verification-email",
                    "/api/auth/check-email",
                    "/api/auth/verify-phone",
                    "/api/exercises/**",
                    "/api/exercise-information/**",
                    "/test/**",
                    "/error", // /error는 보통 허용합니다.
                    "/oauth2/authorization/**", // OAuth2 시작점
                    "/login/oauth2/code/**",      // OAuth2 콜백
                    "/connect/oauth2/code/**"     // 캘린더 연동 콜백
                ).permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                    .oidcUserService(customOidcUserService)
                )
                .successHandler(loginSuccessHandler())
                .redirectionEndpoint(redir -> redir.baseUri("/connect/oauth2/code/*"))
                .authorizationEndpoint(auth -> auth
                    .authorizationRequestResolver(
                        new CustomAuthorizationRequestResolver(
                            clientRegistrationRepository,
                            redisTemplate,
                            userService
                        )
                    )
                )
            )
            .addFilterBefore(new CalendarLinkingLoggingFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider, customUserDetailsService, userRepository),
                    UsernamePasswordAuthenticationFilter.class); // JwtAuthenticationFilter 위치 변경 권장

        return http.build();
    }

    // ⭐ 통합 OAuth2 로그인 성공 핸들러
    private AuthenticationSuccessHandler loginSuccessHandler() {
        return (request, response, authentication) -> {
            try {
                OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
                String registrationId = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();
                Map<String, Object> attributes = oAuth2User.getAttributes();

                boolean isCalendarLink = "google-connect".equals(registrationId) || oAuth2User.getAttribute("calendarLinking") != null;

                System.err.println("[CAL-LINK][SUCCESS] provider=" + registrationId + ", calendarLink=" + isCalendarLink);
                System.err.println("[CAL-LINK][SUCCESS] attrsKeys=" + attributes.keySet());

                // 폴백: userId 속성이 없으면 세션/Redis/쿠키/state로 복구 시도
                Long recoveredUserId = null;
                if (attributes.get("userId") == null) {
                    try {
                        jakarta.servlet.http.HttpSession ses = request.getSession(false);
                        if (ses != null) {
                            Object marker = ses.getAttribute("calendar_linking_active");
                            Object uid = ses.getAttribute("calendar_linking_user_id");
                            if (Boolean.TRUE.equals(marker) && uid != null) {
                                recoveredUserId = Long.parseLong(String.valueOf(uid));
                                System.err.println("[CAL-LINK][RECOVER] session userId=" + recoveredUserId);
                            }
                            if (recoveredUserId == null) {
                                String key = "calendar_session:" + ses.getId();
                                Object val = redisTemplate.opsForValue().get(key);
                                if (val != null) {
                                    recoveredUserId = Long.parseLong(String.valueOf(val));
                                    System.err.println("[CAL-LINK][RECOVER] redis session userId=" + recoveredUserId);
                                }
                            }
                        }
                        if (recoveredUserId == null && request.getCookies() != null) {
                            for (jakarta.servlet.http.Cookie c : request.getCookies()) {
                                if ("calendar_link_uid".equals(c.getName())) {
                                    try { recoveredUserId = Long.parseLong(c.getValue()); System.err.println("[CAL-LINK][RECOVER] cookie userId=" + recoveredUserId);} catch (NumberFormatException ignored) {}
                                }
                            }
                        }
                        if (recoveredUserId == null) {
                            String state = request.getParameter("state");
                            if (state != null && !state.isBlank()) {
                                String stateKey = "oauth_state:" + state;
                                Object mapped = redisTemplate.opsForValue().get(stateKey);
                                if (mapped != null) {
                                    recoveredUserId = Long.parseLong(String.valueOf(mapped));
                                    System.err.println("[CAL-LINK][RECOVER] state userId=" + recoveredUserId);
                                }
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("[CAL-LINK][RECOVER] failed: " + e.getMessage());
                    }
                }

                // 캘린더 연동인 경우
                if (isCalendarLink) {
                    Object attrUserId = oAuth2User.getAttribute("userId");
                    Long userId = attrUserId != null ? Long.parseLong(String.valueOf(attrUserId)) : recoveredUserId;
                    System.err.println("[CAL-LINK][SUCCESS] userIdAttr=" + attrUserId + ", recovered=" + recoveredUserId + ", sub=" + oAuth2User.getAttribute("sub"));
                    if (userId == null) {
                        throw new RuntimeException("캘린더 연동 userId 식별 실패");
                    }
                    User user = userService.findById(userId).orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

                    // Google 토큰 Redis에 저장
                    saveGoogleTokenToRedis(authentication, request, oAuth2User.getAttribute("sub"));

                    String token = jwtTokenProvider.createToken(user.getId(), user.getEmail(), user.getName(),
                            user.getOauthProvider(), user.getOauthId(), user.getProfileImage(), user.getRole());

                    String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                            .queryParam("success", "true")
                            .queryParam("token", token)
                            .queryParam("calendarOnly", "true")
                            .build().encode(StandardCharsets.UTF_8).toUriString();

                    System.err.println("[CAL-LINK][REDIRECT] " + targetUrl);
                    response.sendRedirect(targetUrl);
                    return;
                }

                // 일반 소셜 로그인인 경우 - 불필요한 신규계정 생성 방지
                String email, name, picture, oauthId;
                switch (registrationId) {
                    case "google":
                        email = oAuth2User.getAttribute("email");
                        name = oAuth2User.getAttribute("name");
                        picture = oAuth2User.getAttribute("picture");
                        oauthId = oAuth2User.getAttribute("sub");
                        break;
                    default:
                        throw new RuntimeException("지원하지 않는 OAuth2 제공자입니다: " + registrationId);
                }

                System.err.println("[SOCIAL-LOGIN] provider=" + registrationId + ", email=" + email + ", sub=" + oauthId);

                // 1) provider+oauthId로 기존 사용자
                User user = userService.findByProviderAndOAuthId(registrationId, oauthId).orElse(null);
                // 2) 이메일로 기존 사용자(다른 provider/로컬 포함)
                if (user == null && email != null) {
                    user = userService.findByEmail(email).orElse(null);
                }

                boolean allowAutoSignup = Boolean.parseBoolean(System.getenv().getOrDefault("ALLOW_SOCIAL_AUTO_SIGNUP", "false"));
                boolean isNewUser = false;
                if (user == null) {
                    if (!allowAutoSignup) {
                        String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                                .queryParam("success", "false")
                                .queryParam("error", "social_auto_signup_blocked")
                                .build().encode(StandardCharsets.UTF_8).toUriString();
                        System.err.println("[SOCIAL-LOGIN] 신규생성 차단, 리다이렉트: " + targetUrl);
                        response.sendRedirect(targetUrl);
                        return;
                    } else {
                        user = userService.saveOrUpdateOAuth2User(email, name, picture, registrationId, oauthId);
                        isNewUser = true;
                    }
                } else {
                    // 기존 사용자에 필드 병합
                    user.setOauthProvider(registrationId);
                    user.setOauthId(oauthId);
                    user.setProfileImage(picture);
                    if ("google".equals(registrationId)) {
                        user.setGoogleOAuthId(oauthId);
                        user.setGoogleEmail(email);
                        user.setGoogleName(name);
                        user.setGooglePicture(picture);
                        saveGoogleTokenToRedis(authentication, request, oauthId);
                    }
                    user = userService.save(user);
                }

                String token = jwtTokenProvider.createToken(user.getId(), user.getEmail(), user.getName(),
                        user.getOauthProvider(), user.getOauthId(), user.getProfileImage(), user.getRole());

                String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                        .queryParam("success", "true")
                        .queryParam("token", token)
                        .queryParam("provider", user.getOauthProvider())
                        .queryParam("isNewUser", String.valueOf(isNewUser))
                        .queryParam("calendarOnly", "false")
                        .build().encode(StandardCharsets.UTF_8).toUriString();

                System.err.println("[CAL-LINK][REDIRECT] " + targetUrl);
                response.sendRedirect(targetUrl);

            } catch (Exception e) {
                System.err.println("🚨 OAuth2 로그인 성공 핸들러 오류: " + e.getMessage());
                e.printStackTrace();
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "OAuth2 로그인 처리 중 오류가 발생했습니다.");
            }
        };
    }

    private void saveGoogleTokenToRedis(Authentication authentication, HttpServletRequest request, String googleOAuthId) {
        try {
            String registrationId = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();
            OAuth2AuthorizedClient client = authorizedClientRepository.loadAuthorizedClient(
                    registrationId,
                    authentication,
                    request
            );
            if (client == null) {
                 client = authorizedClientService.loadAuthorizedClient(registrationId, authentication.getName());
            }

            if (client != null) {
                String accessToken = client.getAccessToken().getTokenValue();
                String refreshToken = client.getRefreshToken() != null ? client.getRefreshToken().getTokenValue() : null;

                String key = "google_token:" + googleOAuthId;
                Map<String, String> tokenData = new HashMap<>();
                tokenData.put("access_token", accessToken);
                if (refreshToken != null) {
                    tokenData.put("refresh_token", refreshToken);
                }
                tokenData.put("timestamp", String.valueOf(System.currentTimeMillis()));

                redisTemplate.opsForHash().putAll(key, tokenData);
                redisTemplate.expire(key, 3600, TimeUnit.SECONDS);
                System.err.println("🚀 Google 토큰 Redis 저장 완료: " + googleOAuthId);
            } else {
                System.err.println("🚨 OAuth2 클라이언트를 찾을 수 없음");
            }
        } catch (Exception e) {
            System.err.println("🚨 Google 토큰 Redis 저장 실패: " + e.getMessage());
        }
    }

    private String getFrontendBaseUrl() {
        String frontendUrl = System.getenv().getOrDefault("APP_FRONTEND_URL", "http://localhost");
        if (System.getenv("NODE_ENV") == null || System.getenv("NODE_ENV").equals("development")) {
            frontendUrl = "http://localhost";
        }
        return frontendUrl;
    }

    // CORS 설정
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}