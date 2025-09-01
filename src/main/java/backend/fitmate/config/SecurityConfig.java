package backend.fitmate.config;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.InMemoryOAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.OAuth2LoginAuthenticationFilter;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
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
import lombok.extern.slf4j.Slf4j;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Slf4j
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
    private final Environment environment;

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
                    "/api/auth/test-env", // 환경변수 테스트용
                    "/api/auth/save-onboarding-profile", // 온보딩 프로필 저장
                    "/api/exercises/**",
                    "/api/exercise-information/**",
                    "/api/workout/recommend", // 워크아웃 추천 API 공개
                    "/api/workout/templates", // 워크아웃 템플릿 API 공개
                    "/api/workout/full-session-feedback", // 워크아웃 세션 피드백
                    "/api/adaptive-workout/**", // 적응형 워크아웃 API
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
                .redirectionEndpoint(redir -> redir.baseUri("/login/oauth2/code/*")) // 일반 소셜 로그인만 처리
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
            .addFilterAfter(createCalendarOAuth2Filter(), OAuth2LoginAuthenticationFilter.class) // Calendar 필터는 메인 필터 뒤에 배치
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                    UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Calendar 연동용 OAuth2 필터 생성  
    private OAuth2LoginAuthenticationFilter createCalendarOAuth2Filter() {
        OAuth2LoginAuthenticationFilter calendarFilter = new OAuth2LoginAuthenticationFilter(
                clientRegistrationRepository, 
                authorizedClientService, // 동일한 서비스 사용으로 상태 일관성 보장
                "/connect/oauth2/code/*"  // ⚡ ONLY 캘린더 연동 패턴만 처리
        );
        
        // Calendar 전용 success handler 사용
        calendarFilter.setAuthenticationSuccessHandler(calendarSuccessHandler());
        
        // Spring Security가 지멋대로 하는 것 방지를 위한 강화된 설정
        calendarFilter.setAuthenticationFailureHandler((request, response, ex) -> {
            log.error("🚨 Calendar OAuth2 Filter 실패 - Spring Security 지멋대로 동작 감지: {}", ex.getMessage());
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "캘린더 연동 인증 실패");
        });
        
        // ⚡ 추가 안전장치: 일반 소셜 로그인 URL은 절대 처리하지 않도록 명시적 필터링
        calendarFilter.setRequiresAuthenticationRequestMatcher(
            new org.springframework.security.web.util.matcher.AntPathRequestMatcher("/connect/oauth2/code/*")
        );
        
        return calendarFilter;
    }

    // ⭐ Calendar 전용 OAuth2 로그인 성공 핸들러
    private AuthenticationSuccessHandler calendarSuccessHandler() {
        return (request, response, authentication) -> {
            // 🛡️ Spring Security 지멋대로 동작 방지 - 기존 SecurityContext 백업 (try 밖에서 선언)
            Authentication originalAuth = SecurityContextHolder.getContext().getAuthentication();
            log.info("🛡️ [CAL-LINK][SECURITY] 기존 인증 정보 백업: {}", 
                originalAuth != null ? originalAuth.getName() : "anonymous");
                
            try {
                
                OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
                String registrationId = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();
                Map<String, Object> attributes = oAuth2User.getAttributes();

                log.info("[CAL-LINK][SUCCESS] provider={}, URI={}", registrationId, request.getRequestURI());

                // 사용자 ID 복구 (세션, 쿠키, state 등에서)
                Long userId = recoverUserIdForCalendar(request, attributes);
                
                if (userId == null) {
                    log.error("[CAL-LINK][ERROR] 캘린더 연동 사용자 식별 실패");
                    throw new RuntimeException("캘린더 연동 userId 식별 실패");
                }

                User user = userService.findById(userId).orElseThrow(() -> 
                    new RuntimeException("사용자를 찾을 수 없습니다: " + userId));

                // 기존 사용자에 Google Calendar 정보만 추가 (새 계정 생성 안함)
                String googleOauthId = oAuth2User.getAttribute("sub");
                String googleEmail = oAuth2User.getAttribute("email");
                String googleName = oAuth2User.getAttribute("name");
                String googlePicture = oAuth2User.getAttribute("picture");

                log.info("[CAL-LINK][UPDATE] userId={}, 기존계정에 Google 정보 추가", userId);
                
                // 🛡️ Spring Security 지멋대로 동작 방지 - OAuth 제공자 변경 검증
                String originalProvider = user.getOauthProvider();
                String originalOauthId = user.getOauthId();
                
                // 기존 계정에 Google 정보만 추가 (OAuth 제공자 변경 절대 안함)
                user.setGoogleOAuthId(googleOauthId);
                user.setGoogleEmail(googleEmail);
                user.setGoogleName(googleName);
                user.setGooglePicture(googlePicture);
                
                // ⚠️ 중요: OAuth 제공자는 절대 변경되면 안됨
                user.setOauthProvider(originalProvider);  // 강제로 원래 값 유지
                user.setOauthId(originalOauthId);        // 강제로 원래 값 유지
                
                user = userService.save(user);
                
                // 🔍 검증: OAuth 제공자가 변경되었는지 확인
                if (!originalProvider.equals(user.getOauthProvider()) || !originalOauthId.equals(user.getOauthId())) {
                    log.error("🚨 [CAL-LINK][CRITICAL] OAuth 제공자 변경 감지! original={}/{}, current={}/{}",
                        originalProvider, originalOauthId, user.getOauthProvider(), user.getOauthId());
                    throw new RuntimeException("Critical Security Error: OAuth provider changed unexpectedly");
                }

                // Google 토큰 Redis에 저장
                saveGoogleTokenToRedis(authentication, request, googleOauthId);

                // 기존 계정 정보로 JWT 토큰 생성 (OAuth 제공자 변경 안함)
                String token = jwtTokenProvider.createToken(user.getId(), user.getEmail(), user.getName(),
                        user.getOauthProvider(), user.getOauthId(), user.getProfileImage(), user.getRole());

                String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                        .queryParam("success", "true")
                        .queryParam("token", token)
                        .queryParam("calendarOnly", "true")
                        .build().encode(StandardCharsets.UTF_8).toUriString();

                log.info("[CAL-LINK][REDIRECT] 기존계정 유지, 캘린더 정보만 추가 완료: {}", targetUrl);
                
                // 🛡️ Spring Security 지멋대로 동작 방지 - SecurityContext 덮어쓰기 방지
                // 캘린더 연동 후에도 원래 인증 상태 유지
                if (originalAuth != null && !originalAuth.getName().equals("anonymousUser")) {
                    SecurityContextHolder.getContext().setAuthentication(originalAuth);
                    log.info("🛡️ [CAL-LINK][SECURITY] 기존 인증 정보 복원 완료: {}", originalAuth.getName());
                }
                
                response.sendRedirect(targetUrl);

            } catch (Exception e) {
                log.error("🚨 캘린더 연동 성공 핸들러 오류: {}", e.getMessage(), e);
                
                // 🛡️ 오류 발생 시에도 기존 SecurityContext 복원
                if (originalAuth != null && !originalAuth.getName().equals("anonymousUser")) {
                    SecurityContextHolder.getContext().setAuthentication(originalAuth);
                    log.info("🛡️ [CAL-LINK][SECURITY] 오류 발생, 기존 인증 정보 복원: {}", originalAuth.getName());
                }
                
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "캘린더 연동 처리 중 오류가 발생했습니다.");
            }
        };
    }

    // 캘린더 연동용 사용자 ID 복구
    private Long recoverUserIdForCalendar(HttpServletRequest request, Map<String, Object> attributes) {
        Long recoveredUserId = null;
        
        // 1) attributes에서 직접 확인
        Object attrUserId = attributes.get("userId");
        if (attrUserId != null) {
            try { 
                recoveredUserId = Long.parseLong(String.valueOf(attrUserId)); 
                log.info("[CAL-LINK][RECOVER] attributes userId={}", recoveredUserId);
                return recoveredUserId;
            } catch (NumberFormatException ignored) {}
        }

        // 2) 세션에서 확인
        try {
            jakarta.servlet.http.HttpSession ses = request.getSession(false);
            if (ses != null) {
                Object marker = ses.getAttribute("calendar_linking_active");
                Object uid = ses.getAttribute("calendar_linking_user_id");
                if (Boolean.TRUE.equals(marker) && uid != null) {
                    try { 
                        recoveredUserId = Long.parseLong(String.valueOf(uid)); 
                        log.info("[CAL-LINK][RECOVER] session userId={}", recoveredUserId);
                        return recoveredUserId;
                    } catch (NumberFormatException ignored) {}
                }
                
                // Redis 세션 키 확인
                String sessionKey = "calendar_session:" + ses.getId();
                Object val = redisTemplate.opsForValue().get(sessionKey);
                if (val != null) {
                    try { 
                        recoveredUserId = Long.parseLong(String.valueOf(val)); 
                        log.info("[CAL-LINK][RECOVER] redis session userId={}", recoveredUserId);
                        return recoveredUserId;
                    } catch (NumberFormatException ignored) {}
                }
            }
        } catch (Exception e) {
            log.warn("[CAL-LINK][RECOVER] session failed: {}", e.getMessage());
        }

        // 3) 쿠키에서 확인
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie c : request.getCookies()) {
                if ("calendar_link_uid".equals(c.getName())) {
                    try { 
                        recoveredUserId = Long.parseLong(c.getValue()); 
                        log.info("[CAL-LINK][RECOVER] cookie userId={}", recoveredUserId);
                        return recoveredUserId;
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        // 4) state에서 확인
        String state = request.getParameter("state");
        if (state != null && !state.isBlank()) {
            String stateKey = "oauth_state:" + state;
            Object mapped = redisTemplate.opsForValue().get(stateKey);
            if (mapped != null) {
                try { 
                    recoveredUserId = Long.parseLong(String.valueOf(mapped)); 
                    log.info("[CAL-LINK][RECOVER] state userId={}", recoveredUserId);
                    return recoveredUserId;
                } catch (NumberFormatException ignored) {}
            }
        }

        return null;
    }

    // ⭐ 일반 소셜 로그인 성공 핸들러 (Calendar 연동 로직 제거)
    private AuthenticationSuccessHandler loginSuccessHandler() {
        return (request, response, authentication) -> {
            try {
                OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
                String registrationId = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();
                
                log.info("[SOCIAL-LOGIN][SUCCESS] provider={}, URI={}", registrationId, request.getRequestURI());

                // 일반 소셜 로그인인 경우 - 불필요한 신규계정 생성 방지
                String email, name, picture, oauthId;
                switch (registrationId) {
                    case "google":
                        email = oAuth2User.getAttribute("email");
                        name = oAuth2User.getAttribute("name");
                        picture = oAuth2User.getAttribute("picture");
                        oauthId = oAuth2User.getAttribute("sub");
                        break;
                    case "kakao":
                        email = oAuth2User.getAttribute("email");
                        name = oAuth2User.getAttribute("name");
                        picture = oAuth2User.getAttribute("picture");
                        // 카카오 ID는 Long 타입으로 반환되므로 안전하게 처리
                        Object kakaoIdObj = oAuth2User.getAttribute("id");
                        if (kakaoIdObj instanceof Long) {
                            oauthId = String.valueOf(kakaoIdObj);
                        } else if (kakaoIdObj instanceof Integer) {
                            oauthId = String.valueOf(kakaoIdObj);
                        } else if (kakaoIdObj instanceof String) {
                            oauthId = (String) kakaoIdObj;
                        } else {
                            oauthId = String.valueOf(kakaoIdObj);
                        }
                        break;
                    case "naver":
                        email = oAuth2User.getAttribute("email");
                        name = oAuth2User.getAttribute("name");
                        picture = oAuth2User.getAttribute("picture");
                        // 네이버 ID는 char[] 배열일 수 있으므로 안전하게 처리
                        Object naverIdObj = oAuth2User.getAttribute("id");
                        if (naverIdObj instanceof char[]) {
                            oauthId = new String((char[]) naverIdObj);
                        } else {
                            oauthId = String.valueOf(naverIdObj);
                        }
                        break;
                    default:
                        throw new RuntimeException("지원하지 않는 OAuth2 제공자입니다: " + registrationId);
                }

                log.info("[SOCIAL-LOGIN] provider={}, email={}, sub={}", registrationId, email, oauthId);

                // 이메일이 null인 경우 처리
                if (email == null || email.trim().isEmpty()) {
                    log.warn("[SOCIAL-LOGIN] 이메일이 없어서 오류 처리: provider={}, sub={}", registrationId, oauthId);
                    String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                            .queryParam("success", "false")
                            .queryParam("error", "email_not_provided")
                            .queryParam("message", "소셜 로그인에서 이메일 정보를 가져올 수 없습니다.")
                            .build().encode(StandardCharsets.UTF_8).toUriString();
                    log.info("[SOCIAL-LOGIN] 이메일 없음으로 인한 리다이렉트: {}", targetUrl);
                    response.sendRedirect(targetUrl);
                    return;
                }

                // provider+oauthId로만 기존 사용자 찾기 (완전 분리: 로컬/구글/네이버/카카오 모두 독립 계정)
                User user = userService.findByProviderAndOAuthId(registrationId, oauthId).orElse(null);

                String envValue = environment.getProperty("ALLOW_SOCIAL_AUTO_SIGNUP", "false");
                boolean allowAutoSignup = Boolean.parseBoolean(envValue);
                log.info("[SOCIAL-LOGIN] ALLOW_SOCIAL_AUTO_SIGNUP env={}, parsed={}", envValue, allowAutoSignup);
                boolean isNewUser = false;
                if (user == null) {
                    if (!allowAutoSignup) {
                        String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                                .queryParam("success", "false")
                                .queryParam("error", "social_auto_signup_blocked")
                                .build().encode(StandardCharsets.UTF_8).toUriString();
                        log.info("[SOCIAL-LOGIN] 신규생성 차단, 리다이렉트: {}", targetUrl);
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
                    } else if ("kakao".equals(registrationId) || "naver".equals(registrationId)) {
                        saveProviderTokenToRedis(authentication, request, registrationId, oauthId);
                    }
                    user = userService.save(user);
                }

                String token = jwtTokenProvider.createToken(user.getId(), user.getEmail(), user.getName(),
                        user.getOauthProvider(), user.getOauthId(), user.getProfileImage(), user.getRole());

                // 온보딩 필요 여부 판별 (관리자나 테스트 계정은 온보딩 스킵)
                boolean needsOnboarding = isNewUser && !"ROLE_ADMIN".equals(user.getRole()) 
                        && !isTestAccount(user.getEmail(), user.getName());

                String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                        .queryParam("success", "true")
                        .queryParam("token", token)
                        .queryParam("provider", user.getOauthProvider())
                        .queryParam("isNewUser", String.valueOf(isNewUser))
                        .queryParam("needsOnboarding", String.valueOf(needsOnboarding))
                        .queryParam("calendarOnly", "false")
                        .build().encode(StandardCharsets.UTF_8).toUriString();

                log.info("[CAL-LINK][REDIRECT] {}", targetUrl);
                response.sendRedirect(targetUrl);

            } catch (Exception e) {
                log.error("🚨 OAuth2 로그인 성공 핸들러 오류: {}", e.getMessage(), e);
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "OAuth2 로그인 처리 중 오류가 발생했습니다.");
            }
        };
    }

    private Long safeParseLong(Object value) {
        try { return Long.parseLong(String.valueOf(value)); } catch (Exception e) { return null; }
    }

    // 테스트 계정 판별 (이메일 패턴 또는 이름 패턴으로 판별)
    private boolean isTestAccount(String email, String name) {
        if (email == null && name == null) return false;
        
        // 이메일 패턴 체크
        if (email != null) {
            String emailLower = email.toLowerCase();
            if (emailLower.contains("test") || emailLower.contains("admin") || 
                emailLower.startsWith("test@") || emailLower.startsWith("admin@")) {
                return true;
            }
        }
        
        // 이름 패턴 체크  
        if (name != null) {
            String nameLower = name.toLowerCase();
            if (nameLower.contains("test") || nameLower.contains("admin") || 
                nameLower.contains("테스트") || nameLower.contains("관리자")) {
                return true;
            }
        }
        
        return false;
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
                log.info("🚀 Google 토큰 Redis 저장 완료: {}", googleOAuthId);
            } else {
                log.warn("🚨 OAuth2 클라이언트를 찾을 수 없음");
            }
        } catch (Exception e) {
            log.error("🚨 Google 토큰 Redis 저장 실패: {}", e.getMessage());
        }
    }

    // 카카오/네이버 토큰 저장 공통 메서드
    private void saveProviderTokenToRedis(Authentication authentication, HttpServletRequest request, String provider, String oauthId) {
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
                String key = provider + "_token:" + oauthId;
                Map<String, String> tokenData = new HashMap<>();
                tokenData.put("access_token", accessToken);
                if (refreshToken != null) {
                    tokenData.put("refresh_token", refreshToken);
                }
                tokenData.put("timestamp", String.valueOf(System.currentTimeMillis()));
                redisTemplate.opsForHash().putAll(key, tokenData);
                redisTemplate.expire(key, 3600, TimeUnit.SECONDS);
                log.info("🚀 {} 토큰 Redis 저장 완료: {}", provider, oauthId);
            } else {
                log.warn("🚨 OAuth2 클라이언트를 찾을 수 없음");
            }
        } catch (Exception e) {
            log.error("🚨 {} 토큰 Redis 저장 실패: {}", provider, e.getMessage());
        }
    }

    private String getFrontendBaseUrl() {
        // 현재 요청에서 원본 도메인 확인
        try {
            HttpServletRequest currentRequest = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
            
            // 1. 먼저 세션에서 저장된 원본 도메인 확인 (OAuth 시작 시 저장됨)
            String originalDomain = (String) currentRequest.getSession().getAttribute("oauth_original_domain");
            if (originalDomain != null && !originalDomain.trim().isEmpty()) {
                log.info("[DYNAMIC-OAUTH] 세션에서 원본 도메인 복원: {}", originalDomain);
                return originalDomain;
            }
            
            // 2. state 파라미터로 Redis에서 원본 도메인 확인
            String state = currentRequest.getParameter("state");
            if (state != null) {
                String stateKey = "oauth_domain:" + state;
                Object domainObj = redisTemplate.opsForValue().get(stateKey);
                if (domainObj != null) {
                    String domain = String.valueOf(domainObj);
                    log.info("[DYNAMIC-OAUTH] Redis에서 원본 도메인 복원: state={}, domain={}", state, domain);
                    return domain;
                }
            }
            
            // 3. 현재 요청이 Cloudflare 터널인지 확인
            String host = currentRequest.getHeader("Host");
            String xForwardedHost = currentRequest.getHeader("X-Forwarded-Host");
            
            if (xForwardedHost != null && xForwardedHost.contains("trycloudflare.com")) {
                String baseUrl = "https://" + xForwardedHost;
                log.info("[DYNAMIC-OAUTH] X-Forwarded-Host에서 Cloudflare 터널 감지: {}", baseUrl);
                return baseUrl;
            }
            
            if (host != null && host.contains("trycloudflare.com")) {
                String baseUrl = "https://" + host;
                log.info("[DYNAMIC-OAUTH] Host에서 Cloudflare 터널 감지: {}", baseUrl);
                return baseUrl;
            }
            
            // 4. 세션에서 동적 base URL 확인 (기존 방식)
            String dynamicBaseUrl = (String) currentRequest.getSession().getAttribute("dynamicBaseUrl");
            if (dynamicBaseUrl != null && !dynamicBaseUrl.trim().isEmpty()) {
                if (dynamicBaseUrl.contains(".trycloudflare.com")) {
                    dynamicBaseUrl = dynamicBaseUrl.replace("http://", "https://");
                }
                log.info("[DYNAMIC-OAUTH] 세션에서 동적 Base URL 사용: {}", dynamicBaseUrl);
                return dynamicBaseUrl;
            }
        } catch (Exception e) {
            log.debug("[DYNAMIC-OAUTH] Base URL 복원 실패: {}", e.getMessage());
        }
        
        // 5. 기본값 사용 (localhost)
        String frontendUrl = System.getenv().getOrDefault("APP_FRONTEND_URL", "http://localhost");
        if (System.getenv("NODE_ENV") == null || System.getenv("NODE_ENV").equals("development")) {
            frontendUrl = "http://localhost";
        }
        log.info("[DYNAMIC-OAUTH] 기본 Base URL 사용: {}", frontendUrl);
        return frontendUrl;
    }

    // CORS 설정
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 개발 환경에서만 허용되는 도메인들
        String[] allowedOrigins = {
            "http://localhost:5173",  // Frontend dev server
            "http://localhost:80",    // Nginx local
            "http://localhost:3000",   // Alternative dev port
            "https://*.trycloudflare.com" // Cloudflare tunnel (동적 주소)
        };
        configuration.setAllowedOriginPatterns(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        
        // 필요한 헤더만 명시적으로 허용
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "X-Requested-With", "Accept",
            "Origin", "Cache-Control", "X-File-Name"
        ));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}