package backend.fitmate.infrastructure.scheduling;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

/**
 * 스케줄링 설정
 * 매일 정기 작업 실행을 위한 스케줄러 활성화
 */
@Configuration
@EnableScheduling
public class SchedulingConfig implements SchedulingConfigurer {
    
    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        ThreadPoolTaskScheduler threadPoolTaskScheduler = new ThreadPoolTaskScheduler();
        threadPoolTaskScheduler.setPoolSize(5);
        threadPoolTaskScheduler.setThreadNamePrefix("scheduled-task-");
        threadPoolTaskScheduler.setAwaitTerminationSeconds(60);
        threadPoolTaskScheduler.setWaitForTasksToCompleteOnShutdown(true);
        threadPoolTaskScheduler.initialize();
        
        taskRegistrar.setTaskScheduler(threadPoolTaskScheduler);
    }
}