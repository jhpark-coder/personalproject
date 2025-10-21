package backend.fitmate;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@EnableCaching
@EnableJpaAuditing(dateTimeProviderRef = "koreaDateTimeProvider")
@ConfigurationPropertiesScan
@EnableAspectJAutoProxy
@EnableScheduling
public class FitmateApplication {

	public static void main(String[] args) {
		SpringApplication.run(FitmateApplication.class, args);
	}

	@Bean
	public RestTemplate restTemplate() {
		return new RestTemplate();
	}

	@Bean(name = "koreaDateTimeProvider")
	public DateTimeProvider koreaDateTimeProvider() {
		return () -> Optional.of(LocalDateTime.now(ZoneId.of("Asia/Seoul")));
	}
}
