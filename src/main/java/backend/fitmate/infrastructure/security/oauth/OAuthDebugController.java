package backend.fitmate.infrastructure.security.oauth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/oauth/debug")
@Profile("!dev") // dev 프로파일에서는 비활성화
public class OAuthDebugController {
    
    @Autowired
    private Environment env;
    
    @Autowired(required = false)
    private ClientRegistrationRepository clientRegistrationRepository;
    
    @Value("${app.backend.url:not-set}")
    private String appBackendUrl;
    
    @GetMapping("/info")
    public Map<String, Object> getOAuthInfo() {
        Map<String, Object> info = new HashMap<>();
        
        // 프로파일 정보
        info.put("activeProfiles", env.getActiveProfiles());
        
        // 앱 URL 설정
        info.put("app.backend.url", appBackendUrl);
        info.put("app.frontend.url", env.getProperty("app.frontend.url"));
        
        // OAuth redirect URI 설정 (from properties)
        Map<String, String> redirectUris = new HashMap<>();
        redirectUris.put("google-property", env.getProperty("spring.security.oauth2.client.registration.google.redirect-uri"));
        redirectUris.put("kakao-property", env.getProperty("spring.security.oauth2.client.registration.kakao.redirect-uri"));
        redirectUris.put("naver-property", env.getProperty("spring.security.oauth2.client.registration.naver.redirect-uri"));
        info.put("redirect-uris-from-properties", redirectUris);
        
        // 환경변수
        Map<String, String> envVars = new HashMap<>();
        envVars.put("OAUTH_REDIRECT_BASE_URL", System.getenv("OAUTH_REDIRECT_BASE_URL"));
        envVars.put("KAKAO_REDIRECT_URI", System.getenv("KAKAO_REDIRECT_URI"));
        envVars.put("NAVER_REDIRECT_URI", System.getenv("NAVER_REDIRECT_URI"));
        envVars.put("GOOGLE_REDIRECT_URI", System.getenv("GOOGLE_REDIRECT_URI"));
        info.put("environment-variables", envVars);
        
        return info;
    }
    
    @GetMapping("/registration/{provider}")
    public Map<String, Object> getRegistrationInfo(@PathVariable String provider) {
        Map<String, Object> info = new HashMap<>();
        
        try {
            if (clientRegistrationRepository == null) {
                info.put("error", "OAuth2 is not configured in dev profile");
                return info;
            }
            ClientRegistration registration = clientRegistrationRepository.findByRegistrationId(provider);
            if (registration != null) {
                info.put("provider", provider);
                info.put("clientId", registration.getClientId());
                info.put("redirectUri", registration.getRedirectUri());
                info.put("authorizationUri", registration.getProviderDetails().getAuthorizationUri());
                info.put("tokenUri", registration.getProviderDetails().getTokenUri());
                info.put("scopes", registration.getScopes());
            } else {
                info.put("error", "Provider not found: " + provider);
            }
        } catch (Exception e) {
            info.put("error", e.getMessage());
        }
        
        return info;
    }
}