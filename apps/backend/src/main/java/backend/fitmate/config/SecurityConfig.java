package backend.fitmate.config;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.util.UriComponentsBuilder;

import backend.fitmate.service.CustomUserDetailsService;
import backend.fitmate.user.entity.User;
import backend.fitmate.user.repository.UserRepository;
import backend.fitmate.user.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;
    private final UserService userService;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final OAuth2AuthorizedClientService clientService;
    private final JwtCookieService jwtCookieService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.cors.allowed-origin-patterns:}")
    private String allowedOriginPatterns;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/signup",
                    "/api/auth/send-verification-email",
                    "/api/auth/verify-email-code",
                    "/api/auth/resend-verification-email",
                    "/api/auth/check-email",
                    "/api/auth/verify-phone",
                    "/test/**"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/exercises/**", "/api/exercise-information/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/exercises/**", "/api/exercise-information/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/exercises/**", "/api/exercise-information/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/exercises/**", "/api/exercise-information/**").hasRole("ADMIN")
                .requestMatchers("/oauth2/**", "/login/oauth2/**", "/error").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
                .successHandler(oAuth2AuthenticationSuccessHandler())
            )
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider, customUserDetailsService, userRepository, jwtCookieService),
                    UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers(
                    "/api/auth/login",
                    "/api/auth/signup",
                    "/api/auth/check-email",
                    "/api/auth/verify-phone",
                    "/oauth2/**",
                    "/login/oauth2/**",
                    "/error",
                    "/test/**"
                ))
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );

        return http.build();
    }

    @Bean
    @SuppressWarnings("unchecked")
    public AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler() {
        return (request, response, authentication) -> {
            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
            String registrationId = ((org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken) authentication)
                    .getAuthorizedClientRegistrationId();

            Map<String, Object> attributes = oAuth2User.getAttributes();
            log.debug("OAuth2 success handler started: provider={}, keys={}", registrationId, attributes.keySet());

            String email;
            String name;
            String picture;
            String oauthId;

            try {
                switch (registrationId) {
                    case "google":
                        email = (String) attributes.get("email");
                        name = (String) attributes.get("name");
                        picture = (String) attributes.get("picture");
                        oauthId = (String) attributes.get("sub");
                        break;
                    case "naver":
                        email = (String) attributes.get("email");
                        name = (String) attributes.get("name");
                        picture = (String) attributes.get("profile_image");
                        oauthId = (String) attributes.get("id");
                        if (picture == null) {
                            picture = (String) attributes.get("profile_image_url");
                        }
                        if (picture == null) {
                            picture = "";
                        }
                        break;
                    case "kakao":
                        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
                        Map<String, Object> kakaoProfile = (Map<String, Object>) kakaoAccount.get("profile");
                        email = (String) kakaoAccount.get("email");
                        name = (String) kakaoProfile.get("nickname");
                        picture = (String) kakaoProfile.get("profile_image_url");
                        oauthId = attributes.get("id").toString();
                        break;
                    default:
                        throw new RuntimeException("Unsupported OAuth2 provider: " + registrationId);
                }

                boolean isCalendarRequest = false;
                Long calendarLinkingUserId = null;

                try {
                    java.util.Set<String> keys = redisTemplate.keys("calendar_linking_user:*");
                    if (keys != null && !keys.isEmpty() && "google".equals(registrationId)) {
                        String firstKey = keys.iterator().next();
                        String storedUserId = (String) redisTemplate.opsForValue().get(firstKey);
                        if (storedUserId != null) {
                            try {
                                Long userId = Long.parseLong(storedUserId);
                                User user = userRepository.findById(userId).orElse(null);
                                if (user != null) {
                                    isCalendarRequest = true;
                                    calendarLinkingUserId = userId;
                                    redisTemplate.delete(firstKey);
                                    log.debug("Calendar OAuth linking request detected: userId={}", userId);
                                } else {
                                    log.warn("Calendar OAuth linking user not found: userId={}", userId);
                                }
                            } catch (NumberFormatException e) {
                                log.warn("Invalid calendar linking user id in Redis.");
                            }
                        }
                    }

                    if (!isCalendarRequest) {
                        log.debug("No calendar OAuth linking request found: provider={}", registrationId);
                    }
                } catch (Exception e) {
                    log.warn("Failed to read calendar linking state from Redis.", e);
                }

                User user;
                boolean isNewUser;

                if (isCalendarRequest && "google".equals(registrationId) && calendarLinkingUserId != null) {
                    user = userService.addGoogleCalendarInfoByUserId(calendarLinkingUserId, email, name, picture, oauthId);
                    isNewUser = false;
                } else {
                    user = userService.saveOrUpdateOAuth2User(email, name, picture, registrationId, oauthId);
                    isNewUser = user.getCreatedAt().isAfter(java.time.LocalDateTime.now().minusSeconds(5));
                }

                log.debug("OAuth2 user persisted: userId={}, provider={}, isNewUser={}", user.getId(), registrationId, isNewUser);

                if (isCalendarRequest && "google".equals(registrationId) && user.getGoogleOAuthId() != null) {
                    try {
                        OAuth2AuthorizedClient client = clientService.loadAuthorizedClient("google", oauthId);
                        if (client != null) {
                            String accessToken = client.getAccessToken().getTokenValue();
                            String refreshToken = client.getRefreshToken() != null ? client.getRefreshToken().getTokenValue() : null;

                            String key = "google_token:" + user.getGoogleOAuthId();
                            Map<String, String> tokenData = new HashMap<>();
                            tokenData.put("access_token", accessToken);
                            if (refreshToken != null) {
                                tokenData.put("refresh_token", refreshToken);
                            }
                            tokenData.put("timestamp", String.valueOf(System.currentTimeMillis()));

                            redisTemplate.opsForHash().putAll(key, tokenData);
                            redisTemplate.expire(key, 3600, TimeUnit.SECONDS);

                            log.debug("Google OAuth token stored for calendar linking: userId={}", user.getId());
                        } else {
                            log.warn("OAuth2 authorized client not found for calendar linking.");
                        }
                    } catch (Exception e) {
                        log.warn("Failed to store Google OAuth token for calendar linking.", e);
                    }
                }

                String token = jwtTokenProvider.createToken(user.getId(), user.getEmail(), user.getName(),
                        user.getOauthProvider(), user.getOauthId(), user.getProfileImage(), user.getRole());
                jwtCookieService.addAuthCookie(response, token);

                String frontendBase = frontendUrl;
                if (frontendBase == null || frontendBase.isBlank()) {
                    frontendBase = "http://localhost:5173";
                }
                frontendBase = frontendBase.replaceAll("/$", "");

                String callbackQuery = UriComponentsBuilder.newInstance()
                        .queryParam("success", "true")
                        .queryParam("provider", user.getOauthProvider())
                        .queryParam("isNewUser", String.valueOf(isNewUser))
                        .build()
                        .encode(StandardCharsets.UTF_8)
                        .toUriString();
                String targetUrl = frontendBase + "/#/auth/callback" + callbackQuery;

                log.debug("OAuth2 redirect prepared.");
                response.sendRedirect(targetUrl);
            } catch (Exception e) {
                log.error("OAuth2 success handler failed.", e);
                throw e;
            }
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(resolveAllowedOriginPatterns());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "X-XSRF-TOKEN"
        ));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> resolveAllowedOriginPatterns() {
        List<String> origins = new ArrayList<>();
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            origins.add(frontendUrl.trim());
        }
        if (allowedOriginPatterns != null && !allowedOriginPatterns.isBlank()) {
            Arrays.stream(allowedOriginPatterns.split(","))
                    .map(String::trim)
                    .filter(origin -> !origin.isBlank())
                    .filter(origin -> !origins.contains(origin))
                    .forEach(origins::add);
        }
        return origins;
    }
}
