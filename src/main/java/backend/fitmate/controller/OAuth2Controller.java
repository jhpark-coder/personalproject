package backend.fitmate.controller;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/oauth2")
@CrossOrigin(origins = "${app.frontend.url}")
public class OAuth2Controller {

    @Autowired
    private UserService userService;

    @GetMapping("/login-success")
    public ResponseEntity<?> loginSuccess(@AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "인증되지 않은 사용자입니다.");
            return ResponseEntity.badRequest().body(response);
        }

        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String provider = oauth2User.getAttribute("provider");

        // 사용자가 이미 존재하는지 확인
        var existingUser = userService.findByEmail(email);
        
        if (existingUser.isPresent()) {
            // 기존 사용자 로그인
            User user = existingUser.get();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "로그인 성공");
            response.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "name", user.getName(),
                "nickname", user.getNickname() != null ? user.getNickname() : "",
                "provider", provider
            ));
            return ResponseEntity.ok(response);
        } else {
            // 새 사용자 자동 회원가입
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(name);
            newUser.setEmailVerified(true); // OAuth2 사용자는 이메일 인증 완료로 간주
            newUser.setPassword(""); // OAuth2 사용자는 비밀번호 없음
            
            User savedUser = userService.saveOAuth2User(newUser);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "회원가입 및 로그인 성공");
            response.put("user", Map.of(
                "id", savedUser.getId(),
                "email", savedUser.getEmail(),
                "name", savedUser.getName(),
                "nickname", savedUser.getNickname() != null ? savedUser.getNickname() : "",
                "provider", provider
            ));
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping("/login-failure")
    public ResponseEntity<?> loginFailure() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "소셜 로그인에 실패했습니다.");
        return ResponseEntity.badRequest().body(response);
    }
} 