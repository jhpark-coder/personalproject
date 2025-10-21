package backend.fitmate.infrastructure.external;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.texttospeech.v1.TextToSpeechClient;
import com.google.cloud.texttospeech.v1.TextToSpeechSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;

@Configuration
public class GoogleCloudConfig {

    @Value("${google.cloud.credentials.path}")
    private String credentialsPath;

    @Value("${google.cloud.project.id}")
    private String projectId;

    @Bean
    public GoogleCredentials googleCredentials() throws IOException {
        InputStream inputStream = new ClassPathResource(credentialsPath.replace("classpath:", "")).getInputStream();
        return GoogleCredentials.fromStream(inputStream);
    }

    @Bean
    public TextToSpeechClient textToSpeechClient(GoogleCredentials credentials) throws IOException {
        TextToSpeechSettings settings = TextToSpeechSettings.newBuilder()
                .setCredentialsProvider(() -> credentials)
                .build();
        
        return TextToSpeechClient.create(settings);
    }
}
