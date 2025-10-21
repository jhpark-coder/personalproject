package backend.fitmate.domain.notification.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import backend.fitmate.domain.notification.service.TextToSpeechService;
import lombok.extern.slf4j.Slf4j;

/**
 * TTS (Text-to-Speech) 컨트롤러
 * Google Cloud TTS 또는 브라우저 TTS 사용
 */
@RestController
@RequestMapping("/api/tts")
@CrossOrigin(origins = "*")
@Slf4j
public class TTSController {
    
    @Autowired(required = false)
    private TextToSpeechService textToSpeechService;
    
    /**
     * TTS 서비스 상태 확인
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> response = new HashMap<>();
        
        // Google Cloud TTS 서비스 활성화 여부 확인
        boolean available = textToSpeechService != null;
        response.put("available", available);
        response.put("message", available ? "Google Cloud TTS is available" : "Google Cloud TTS is not configured, using browser TTS fallback");
        
        log.info("TTS 서비스 상태: {}", available ? "Google Cloud TTS 사용 가능" : "브라우저 TTS 사용");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * TTS 음성 목록 제공
     */
    @GetMapping("/voices")
    public ResponseEntity<Map<String, Object>> getVoices() {
        Map<String, Object> response = new HashMap<>();
        
        // Google Cloud TTS가 활성화된 경우
        if (textToSpeechService != null) {
            response = textToSpeechService.getAvailableKoreanVoices();
            response.put("success", true);
        } else {
            // 브라우저 TTS 사용 시 기본 음성 목록
            String[] voices = {
                "ko-KR-Standard-A",  // 여성 음성
                "ko-KR-Standard-B",  // 여성 음성
                "ko-KR-Standard-C",  // 남성 음성
                "ko-KR-Standard-D"   // 남성 음성
            };
            response.put("success", true);
            response.put("voices", voices);
        }
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * TTS 음성 합성 (Google Cloud TTS 또는 브라우저 TTS 사용)
     */
    @PostMapping("/synthesize")
    public ResponseEntity<?> synthesize(@RequestBody TTSRequest request) {
        log.info("TTS 요청 - text: {}, voice: {}", request.getText(), request.getVoice());
        
        // Google Cloud TTS 사용 가능한 경우
        if (textToSpeechService != null) {
            try {
                log.info("Google Cloud TTS로 음성 합성 시도");
                byte[] audioContent = textToSpeechService.synthesizeSpeech(
                    request.getText(),
                    request.getVoice(),
                    request.getLanguage()
                );
                
                log.info("Google Cloud TTS 음성 합성 성공 - 크기: {} bytes", audioContent.length);
                
                return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, "audio/mp3")
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"speech.mp3\"")
                    .body(audioContent);
            } catch (IOException e) {
                log.error("Google Cloud TTS 실패: ", e);
                // 실패 시 브라우저 TTS 권장
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Google Cloud TTS failed, use browser TTS");
                response.put("browserTTSRecommended", true);
                response.put("error", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        }
        
        // Google Cloud TTS 사용 불가능한 경우 브라우저 TTS 권장
        log.info("Google Cloud TTS 사용 불가 - 브라우저 TTS 사용 권장");
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "브라우저 Web Speech API를 사용하세요");
        response.put("browserTTSRecommended", true);
        
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(response);
    }
    
    /**
     * TTS 요청 DTO
     */
    public static class TTSRequest {
        private String text;
        private String voice;
        private String language;
        
        public String getText() {
            return text;
        }
        
        public void setText(String text) {
            this.text = text;
        }
        
        public String getVoice() {
            return voice;
        }
        
        public void setVoice(String voice) {
            this.voice = voice;
        }
        
        public String getLanguage() {
            return language;
        }
        
        public void setLanguage(String language) {
            this.language = language;
        }
    }
}