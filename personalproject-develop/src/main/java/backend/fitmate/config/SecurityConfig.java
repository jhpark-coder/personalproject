package backend.fitmate.config;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import backend.fitmate.User.service.UserService;
import backend.fitmate.User.entity.User;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private UserService userService;

    @Autowired
    private NaverOAuth2UserService naverOAuth2UserService;

    @Autowired
    private KakaoOAuth2UserService kakaoOAuth2UserService;

    @Bean
    public OAuth2UserService<OAuth2UserRequest, OAuth2User> oauth2UserService() {
        return userRequest -> {
            String registrationId = userRequest.getClientRegistration().getRegistrationId();
            
            System.out.println("=== OAuth2 User Service 호출됨 ===");
            System.out.println("Registration ID: " + registrationId);
            System.out.println("Client ID: " + userRequest.getClientRegistration().getClientId());
            System.out.println("Client Secret: " + (userRequest.getClientRegistration().getClientSecret() != null ? "있음" : "없음"));
            
            // 카카오의 경우 전용 서비스 사용
            if ("kakao".equals(registrationId)) {
                return kakaoOAuth2UserService.loadUser(userRequest);
            }
            
            // 네이버의 경우 전용 서비스 사용
            if ("naver".equals(registrationId)) {
                return naverOAuth2UserService.loadUser(userRequest);
            }
            
            // 다른 제공자들은 기본 서비스 사용
            DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
            OAuth2User oauth2User = delegate.loadUser(userRequest);
            
            Map<String, Object> attributes = new HashMap<>(oauth2User.getAttributes());
            attributes.put("provider", registrationId);
            
            return new DefaultOAuth2User(
                oauth2User.getAuthorities(),
                attributes,
                oauth2User.getName()
            );
        };
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/oauth2/authorization/**").permitAll()
                .requestMatchers("/login/oauth2/code/**").permitAll()
                .requestMatchers("/login").permitAll()
                .requestMatchers("/oauth2/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(oauth2UserService())
                )
                .successHandler(new OAuth2AuthenticationSuccessHandler())
                .failureUrl(frontendUrl + "/login?error=oauth2_failed")
            )
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    // OAuth2 성공 핸들러
    public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
        
        @Override
        public void onAuthenticationSuccess(HttpServletRequest request, 
                                         HttpServletResponse response, 
                                         Authentication authentication) throws IOException, ServletException {
            
            System.out.println("=== OAuth2 성공 핸들러 실행됨 ===");
            System.out.println("요청 URL: " + request.getRequestURL());
            System.out.println("요청 파라미터: " + request.getQueryString());
            System.out.println("요청 헤더: " + Collections.list(request.getHeaderNames()));
            
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
            
            // provider 정보 추출
            String provider = (String) oauth2User.getAttribute("provider");
            if (provider == null) {
                provider = "google"; // 기본값
            }
            
            System.out.println("Provider: " + provider);
            System.out.println("OAuth2User 전체 속성: " + oauth2User.getAttributes());
            
            // 사용자 정보 추출
            String email = null;
            String name = null;
            String picture = null;
            String oauthId = null;
            
            switch (provider) {
                case "google":
                    email = oauth2User.getAttribute("email");
                    name = oauth2User.getAttribute("name");
                    picture = oauth2User.getAttribute("picture");
                    oauthId = oauth2User.getAttribute("sub");
                    break;
                case "kakao":
                    // KakaoOAuth2UserService에서 이미 처리된 정보를 직접 사용
                    email = oauth2User.getAttribute("email");
                    name = oauth2User.getAttribute("name");
                    picture = oauth2User.getAttribute("picture");
                    // id가 Long 타입일 수 있으므로 String으로 변환
                    Object idObj = oauth2User.getAttribute("id");
                    oauthId = idObj != null ? idObj.toString() : null;
                    System.out.println("카카오 사용자 정보 추출: email=" + email + ", name=" + name + ", picture=" + picture + ", oauthId=" + oauthId);
                    break;
                case "naver":
                    // NaverOAuth2UserService에서 이미 response 객체를 풀어서 저장했으므로 직접 가져옴
                    email = oauth2User.getAttribute("email");
                    name = oauth2User.getAttribute("name");
                    picture = oauth2User.getAttribute("profile_image");
                    oauthId = oauth2User.getAttribute("id");
                    break;
            }
            
            System.out.println("추출된 사용자 정보 - email: " + email + ", name: " + name + ", picture: " + picture + ", oauthId: " + oauthId);
            
            // 사용자 정보를 데이터베이스에 저장/업데이트
            if (email != null && name != null) {
                User savedUser = userService.saveOrUpdateOAuth2User(email, name, provider, oauthId, picture);
                
                // 새 사용자인지 확인 (createdAt과 updatedAt이 같으면 새 사용자)
                boolean isNewUser = savedUser.getCreatedAt().equals(savedUser.getUpdatedAt());
                
                // JWT 토큰 생성 (사용자 ID 사용)
                String token = jwtTokenProvider.generateToken(savedUser.getId().toString(), email, name);
                
                // 프론트엔드로 리다이렉트 (토큰을 URL 파라미터로 전달)
                String redirectUrl = frontendUrl + "/#/auth/callback?success=true&token=" + token + 
                                   "&provider=" + provider + "&email=" + URLEncoder.encode(email, StandardCharsets.UTF_8) + 
                                   "&isNewUser=" + isNewUser;
                
                if (picture != null) {
                    redirectUrl += "&picture=" + URLEncoder.encode(picture, StandardCharsets.UTF_8);
                }
                
                System.out.println("리다이렉트 URL: " + redirectUrl);
                getRedirectStrategy().sendRedirect(request, response, redirectUrl);
            } else {
                System.out.println("필수 사용자 정보 누락");
                // 필수 정보가 없는 경우 에러 페이지로 리다이렉트
                getRedirectStrategy().sendRedirect(request, response, frontendUrl + "/login?error=missing_info");
            }
        }
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // HTTPS 환경을 포함한 모든 origin 허용
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        // HTTPS 환경에서의 쿠키 및 인증 헤더 허용
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));
        configuration.setMaxAge(3600L); // 1시간 캐시
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
} 