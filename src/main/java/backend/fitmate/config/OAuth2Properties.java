package backend.fitmate.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "oauth2")
public class OAuth2Properties {
    
    private Google google = new Google();
    private Naver naver = new Naver();
    private Kakao kakao = new Kakao();
    
    @Data
    public static class Google {
        private String clientId;
        private String clientSecret;
        private String redirectUri;
    }
    
    @Data
    public static class Naver {
        private String clientId;
        private String clientSecret;
        private String redirectUri;
    }
    
    @Data
    public static class Kakao {
        private String clientId;
        private String clientSecret;
        private String redirectUri;
    }
} 