package backend.fitmate.infrastructure.scheduling;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Configuration
@ConfigurationProperties(prefix = "scheduler")
@Data
public class SchedulerConfig {
    
    private boolean enabled = true;
    private Exercise exercise = new Exercise();
    
    @Data
    public static class Exercise {
        private String updateCron = "0 0 2 * * ?"; // 기본값: 매일 밤 2시
    }
} 