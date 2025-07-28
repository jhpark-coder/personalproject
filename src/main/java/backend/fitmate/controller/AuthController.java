package backend.fitmate.controller;

import backend.fitmate.User.entity.User;
import backend.fitmate.service.EmailVerificationService;
import backend.fitmate.User.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${app.frontend.url}")
public class AuthController {

    @Autowired
    private EmailVerificationService emailVerificationService;
    
    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String email = loginRequest.get("email");
        String password = loginRequest.get("password");
        
        // TODO: 실제 로그인 로직 구현
        // - 이메일/비밀번호 검증
        // - JWT 토큰 생성
        // - 사용자 정보 반환
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "로그인 성공");
        response.put("token", "sample-jwt-token");
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> signupRequest) {
        String email = signupRequest.get("email");
        String password = signupRequest.get("password");
        String nickname = signupRequest.get("nickname");
        String name = signupRequest.get("name");
        String birthDate = signupRequest.get("birthDate");
        String gender = signupRequest.get("gender");
        String phoneNumber = signupRequest.get("phoneNumber");
        
        // 필수 필드 검증
        if (email == null || email.trim().isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "이메일을 입력해주세요.");
            return ResponseEntity.badRequest().body(response);
        }
        
        if (password == null || password.trim().isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "비밀번호를 입력해주세요.");
            return ResponseEntity.badRequest().body(response);
        }
        
        if (name == null || name.trim().isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "이름을 입력해주세요.");
            return ResponseEntity.badRequest().body(response);
        }
        
        if (birthDate == null || birthDate.trim().isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "생년월일을 입력해주세요.");
            return ResponseEntity.badRequest().body(response);
        }
        
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "휴대전화번호를 입력해주세요.");
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            // 실제 회원가입 처리
            User user = userService.signup(email, password, nickname, name, birthDate, gender, phoneNumber);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "회원가입이 완료되었습니다.");
            response.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "name", user.getName(),
                "nickname", user.getNickname() != null ? user.getNickname() : "",
                "birthDate", user.getBirthDate(),
                "gender", user.getGender() != null ? user.getGender() : "",
                "phoneNumber", user.getPhoneNumber(),
                "emailVerified", user.isEmailVerified()
            ));
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "회원가입 처리 중 오류가 발생했습니다.");
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/send-verification-email")
    public ResponseEntity<?> sendVerificationEmail(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        
        if (email == null || email.trim().isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "이메일 주소를 입력해주세요.");
            return ResponseEntity.badRequest().body(response);
        }

        // 이메일 중복 검사
        boolean emailExists = userService.isEmailExists(email);
        if (emailExists) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "이미 사용 중인 이메일입니다.");
            return ResponseEntity.badRequest().body(response);
        }

        boolean sent = emailVerificationService.sendVerificationEmail(email);
        
        Map<String, Object> response = new HashMap<>();
        if (sent) {
            response.put("success", true);
            response.put("message", "인증 코드가 이메일로 발송되었습니다.");
        } else {
            response.put("success", false);
            response.put("message", "이메일 발송에 실패했습니다. 다시 시도해주세요.");
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-email-code")
    public ResponseEntity<?> verifyEmailCode(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String code = request.get("code");
        
        if (email == null || code == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "이메일과 인증 코드를 입력해주세요.");
            return ResponseEntity.badRequest().body(response);
        }

        boolean verified = emailVerificationService.verifyCode(email, code);
        
        if (verified) {
            // 이메일 인증 완료 처리
            userService.verifyEmail(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "이메일 인증이 완료되었습니다.");
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "인증 코드가 올바르지 않거나 만료되었습니다.");
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/resend-verification-email")
    public ResponseEntity<?> resendVerificationEmail(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        
        if (email == null || email.trim().isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "이메일 주소를 입력해주세요.");
            return ResponseEntity.badRequest().body(response);
        }

        boolean sent = emailVerificationService.resendVerificationEmail(email);
        
        Map<String, Object> response = new HashMap<>();
        if (sent) {
            response.put("success", true);
            response.put("message", "인증 코드가 재발송되었습니다.");
        } else {
            response.put("success", false);
            response.put("message", "이메일 재발송에 실패했습니다. 다시 시도해주세요.");
        }
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        boolean exists = userService.isEmailExists(email);
        
        Map<String, Object> response = new HashMap<>();
        response.put("available", !exists);
        response.put("message", exists ? "이미 사용 중인 이메일입니다." : "사용 가능한 이메일입니다.");
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/social-login")
    public ResponseEntity<?> socialLogin(@RequestBody Map<String, String> socialLoginRequest) {
        String provider = socialLoginRequest.get("provider");
        String code = socialLoginRequest.get("code");
        
        // TODO: 소셜 로그인 로직 구현
        // - OAuth2 토큰 교환
        // - 사용자 정보 조회
        // - 회원가입 또는 로그인 처리
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "소셜 로그인 성공");
        response.put("provider", provider);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-phone")
    public ResponseEntity<?> verifyPhone(@RequestBody Map<String, String> phoneRequest) {
        String phoneNumber = phoneRequest.get("phoneNumber");
        
        // TODO: 휴대폰 인증 로직 구현
        // - SMS 발송
        // - 인증번호 검증
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "인증번호가 발송되었습니다.");
        
        return ResponseEntity.ok(response);
    }
} 