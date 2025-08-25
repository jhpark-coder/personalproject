package backend.fitmate.service;

import com.google.cloud.texttospeech.v1.*;
import com.google.protobuf.ByteString;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class TextToSpeechService {

    @Autowired
    private TextToSpeechClient textToSpeechClient;

    @Value("${google.cloud.tts.default.voice}")
    private String defaultVoice;

    @Value("${google.cloud.tts.default.language}")
    private String defaultLanguage;

    /**
     * 텍스트를 음성으로 변환 (Google Cloud TTS)
     */
    public byte[] synthesizeSpeech(String text, String voiceName, String languageCode) throws IOException {
        // 음성 설정
        VoiceSelectionParams voice = VoiceSelectionParams.newBuilder()
                .setLanguageCode(languageCode != null ? languageCode : defaultLanguage)
                .setName(voiceName != null ? voiceName : defaultVoice)
                .build();

        // 오디오 설정
        AudioConfig audioConfig = AudioConfig.newBuilder()
                .setAudioEncoding(AudioEncoding.MP3)
                .setSpeakingRate(1.0f)  // 1.0 = 기본 속도
                .setPitch(0.0f)         // 0.0 = 기본 톤
                .setVolumeGainDb(0.0f)  // 0.0 = 기본 볼륨
                .build();

        // 합성 요청
        SynthesisInput input = SynthesisInput.newBuilder()
                .setText(text)
                .build();

        SynthesizeSpeechRequest request = SynthesizeSpeechRequest.newBuilder()
                .setInput(input)
                .setVoice(voice)
                .setAudioConfig(audioConfig)
                .build();

        // 음성 합성 실행
        SynthesizeSpeechResponse response = textToSpeechClient.synthesizeSpeech(request);
        ByteString audioContent = response.getAudioContent();

        return audioContent.toByteArray();
    }

    /**
     * 기본 설정으로 음성 합성
     */
    public byte[] synthesizeSpeech(String text) throws IOException {
        return synthesizeSpeech(text, null, null);
    }

    /**
     * 사용 가능한 한국어 음성 목록 반환
     */
    public Map<String, Object> getAvailableKoreanVoices() {
        Map<String, Object> voiceCategories = new HashMap<>();
        
        // Standard 음성들 (무료, 기본 품질)
        Map<String, String> standardVoices = new HashMap<>();
        standardVoices.put("ko-KR-Standard-A", "한국어 여성 음성 1 (표준)");
        standardVoices.put("ko-KR-Standard-B", "한국어 여성 음성 2 (표준)");
        standardVoices.put("ko-KR-Standard-C", "한국어 남성 음성 1 (표준)");
        standardVoices.put("ko-KR-Standard-D", "한국어 남성 음성 2 (표준)");
        voiceCategories.put("standard", Map.of(
            "name", "Standard 음성",
            "description", "무료로 사용 가능한 기본 품질 음성",
            "quality", "기본",
            "cost", "무료",
            "voices", standardVoices
        ));
        
        return voiceCategories;
    }

    /**
     * 특정 음성의 상세 정보 반환
     */
    public Map<String, Object> getVoiceDetails(String voiceName) {
        Map<String, Object> details = new HashMap<>();
        
        if (voiceName.startsWith("ko-KR-Standard")) {
            details.put("category", "standard");
            details.put("quality", "기본");
            details.put("cost", "무료");
            details.put("description", "무료로 사용 가능한 기본 품질 음성입니다.");
            details.put("bestFor", "일반적인 알림, 간단한 안내");
        }
        
        details.put("voiceName", voiceName);
        details.put("language", "ko-KR");
        details.put("gender", voiceName.endsWith("A") || voiceName.endsWith("C") ? "여성" : "남성");
        
        return details;
    }

    /**
     * 운동 가이드용 음성 합성 (느린 속도, 명확한 발음)
     */
    public byte[] synthesizeExerciseGuide(String text) throws IOException {
        // 운동 가이드용 오디오 설정
        AudioConfig audioConfig = AudioConfig.newBuilder()
                .setAudioEncoding(AudioEncoding.MP3)
                .setSpeakingRate(0.8f)  // 조금 느린 속도
                .setPitch(0.0f)         // 기본 톤
                .setVolumeGainDb(2.0f)  // 약간 큰 볼륨
                .build();

        VoiceSelectionParams voice = VoiceSelectionParams.newBuilder()
                .setLanguageCode(defaultLanguage)
                .setName(defaultVoice)
                .build();

        SynthesisInput input = SynthesisInput.newBuilder()
                .setText(text)
                .build();

        SynthesizeSpeechRequest request = SynthesizeSpeechRequest.newBuilder()
                .setInput(input)
                .setVoice(voice)
                .setAudioConfig(audioConfig)
                .build();

        SynthesizeSpeechResponse response = textToSpeechClient.synthesizeSpeech(request);
        return response.getAudioContent().toByteArray();
    }

    /**
     * 음성 합성 성공 여부 확인
     */
    public boolean isServiceAvailable() {
        try {
            // 간단한 테스트 텍스트로 서비스 상태 확인
            synthesizeSpeech("테스트");
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
