package backend.fitmate.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/oauth2")
@CrossOrigin(origins = "${app.frontend.url}", allowCredentials = "true")
public class OAuth2Controller {

    @GetMapping("/callback")
    public ResponseEntity<?> oauth2Callback(@RequestParam(required = false) String code,
                                          @RequestParam(required = false) String state,
                                          @RequestParam(required = false) String error) {
        
        Map<String, Object> response = new HashMap<>();
        
        if (error != null) {
            response.put("success", false);
            response.put("error", error);
            response.put("message", "OAuth2 인증에 실패했습니다.");
            return ResponseEntity.badRequest().body(response);
        }
        
        if (code == null) {
            response.put("success", false);
            response.put("message", "인증 코드가 없습니다.");
            return ResponseEntity.badRequest().body(response);
        }
        
        // Spring Security가 처리하도록 리다이렉트
        response.put("success", true);
        response.put("message", "OAuth2 콜백이 처리되었습니다.");
        response.put("code", code);
        response.put("state", state);
        
        return ResponseEntity.ok(response);
    }
} 