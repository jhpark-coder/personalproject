package backend.fitmate.infrastructure.external;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * RestTemplate 설정
 * HTTP 요청을 위한 RestTemplate Bean 등록
 */
@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}