package backend.fitmate.controller;

import backend.fitmate.service.TextToSpeechService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/tts")
@CrossOrigin(origins = "*")
public class TextToSpeechController {

    @Autowired
    private TextToSpeechService textToSpeechService;

    /**
     * 기본 음성 합성
     */
    @PostMapping("/synthesize")
    public ResponseEntity<byte[]> synthesizeSpeech(
            @RequestBody Map<String, String> request) {
        
        try {
            String text = request.get("text");
            String voice = request.get("voice");
            String language = request.get("language");

            if (text == null || text.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            byte[] audioData = textToSpeechService.synthesizeSpeech(text, voice, language);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "speech.mp3");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(audioData);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 운동 가이드용 음성 합성
     */
    @PostMapping("/exercise-guide")
    public ResponseEntity<byte[]> synthesizeExerciseGuide(
            @RequestBody Map<String, String> request) {
        
        try {
            String text = request.get("text");
            
            if (text == null || text.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            byte[] audioData = textToSpeechService.synthesizeExerciseGuide(text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "exercise-guide.mp3");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(audioData);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 사용 가능한 음성 목록 조회
     */
    @GetMapping("/voices")
    public ResponseEntity<Map<String, Object>> getAvailableVoices() {
        Map<String, Object> voices = textToSpeechService.getAvailableKoreanVoices();
        return ResponseEntity.ok(voices);
    }

    /**
     * 특정 음성의 상세 정보 조회
     */
    @GetMapping("/voices/{voiceName}")
    public ResponseEntity<Map<String, Object>> getVoiceDetails(@PathVariable String voiceName) {
        Map<String, Object> details = textToSpeechService.getVoiceDetails(voiceName);
        return ResponseEntity.ok(details);
    }

    /**
     * 음성 미리듣기 (짧은 테스트 텍스트)
     */
    @PostMapping("/preview/{voiceName}")
    public ResponseEntity<byte[]> previewVoice(@PathVariable String voiceName) {
        try {
            String previewText = "안녕하세요, 이 음성의 품질을 확인해보세요.";
            byte[] audioData = textToSpeechService.synthesizeSpeech(previewText, voiceName, "ko-KR");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "voice-preview.mp3");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(audioData);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 서비스 상태 확인
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getServiceStatus() {
        boolean isAvailable = textToSpeechService.isServiceAvailable();
        
        Map<String, Object> status = Map.of(
            "available", isAvailable,
            "service", "Google Cloud Text-to-Speech",
            "timestamp", System.currentTimeMillis()
        );
        
        return ResponseEntity.ok(status);
    }

    /**
     * 간단한 테스트 음성 합성
     */
    @GetMapping("/test")
    public ResponseEntity<byte[]> testSynthesis() {
        try {
            String testText = "안녕하세요, FitMate 음성 가이드입니다.";
            byte[] audioData = textToSpeechService.synthesizeSpeech(testText);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "test.mp3");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(audioData);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
