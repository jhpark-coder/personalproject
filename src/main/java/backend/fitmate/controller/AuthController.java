package backend.fitmate.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.service.UserService;
import backend.fitmate.config.JwtTokenProvider;
import backend.fitmate.config.RateLimit;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;


@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${app.frontend.url}", allowCredentials = "true")
@Slf4j
public class AuthController {

    // @Autowired
    // private EmailVerificationService emailVerificationService;
    
    @Autowired
    private UserService userService;
    

    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${COMMUNICATION_SERVER_URL:http://localhost:4000}")
    private String communicationServerUrl;

    @PostMapping("/login")
    @RateLimit(bucketName = "loginBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String email = loginRequest.get("email");
        String password = loginRequest.get("password");
        
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
        
        try {
            // 사용자 조회
            Optional<User> userOpt = userService.findByEmail(email);
            if (!userOpt.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "존재하지 않는 이메일입니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            User user = userOpt.get();
            
            // 비밀번호 검증 (OAuth2 사용자는 비밀번호가 없을 수 있음)
            if (user.getPassword() == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "소셜 로그인으로 가입한 계정입니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 비밀번호 검증 로직 구현 필요
            if (!passwordEncoder.matches(password, user.getPassword())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "비밀번호가 일치하지 않습니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // JWT 토큰 생성 (일반 로그인은 provider를 "local"로 설정)
            String token = jwtTokenProvider.createToken(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getOauthProvider(),
                user.getOauthId(),
                user.getProfileImage(),
                user.getRole()
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "로그인 성공");
            response.put("token", token);
            
            // user 정보를 HashMap으로 생성
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("email", user.getEmail());
            userData.put("name", user.getName());
            userData.put("nickname", user.getNickname() != null ? user.getNickname() : "");
            userData.put("emailVerified", user.isEmailVerified());
            userData.put("provider", user.getOauthProvider() != null ? user.getOauthProvider() : "local");
            userData.put("picture", user.getProfileImage());
            
            // 기본 정보 필드들 추가
            userData.put("height", user.getHeight());
            userData.put("weight", user.getWeight());
            userData.put("age", user.getAge());
            userData.put("gender", user.getGender());
            userData.put("phoneNumber", user.getPhoneNumber());
            userData.put("birthDate", user.getBirthDate());
            
            response.put("user", userData);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "로그인 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/signup")
    @RateLimit(bucketName = "signupBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> signup(@RequestBody Map<String, String> signupRequest) {
        String email = signupRequest.get("email");
        String password = signupRequest.get("password");
        String nickname = signupRequest.get("nickname");
        String name = signupRequest.get("name");
        String birthDate = signupRequest.get("birthDate");
        String gender = signupRequest.get("gender");
        String phoneNumber = signupRequest.get("phoneNumber");
        String goal = signupRequest.get("goal"); // 운동 목표 추가
        
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
            // 실제 회원가입 처리 (goal 추가)
            User user = userService.signup(email, password, nickname, name, birthDate, gender, phoneNumber, goal);
            
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
                "goal", user.getGoal() != null ? user.getGoal() : "general",
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

    // 이메일 인증 기능을 문자 인증으로 대체하여 주석처리
    /*
    @PostMapping("/send-verification-email")
    @RateLimit(bucketName = "emailVerificationBucket", keyType = RateLimit.KeyType.IP)
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
    */

    // 이메일 인증 코드 검증 기능 주석처리
    /*
    @PostMapping("/verify-email-code")
    @RateLimit(bucketName = "emailVerificationBucket", keyType = RateLimit.KeyType.IP)
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
    */

    // 이메일 인증 코드 재발송 기능 주석처리
    /*
    @PostMapping("/resend-verification-email")
    @RateLimit(bucketName = "emailVerificationBucket", keyType = RateLimit.KeyType.IP)
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
    */

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        boolean exists = userService.isEmailExists(email);
        
        Map<String, Object> response = new HashMap<>();
        response.put("available", !exists);
        response.put("message", exists ? "이미 사용 중인 이메일입니다." : "사용 가능한 이메일입니다.");
        
        return ResponseEntity.ok(response);
    }



    @PostMapping("/verify-phone")
    public ResponseEntity<?> verifyPhone(@RequestBody Map<String, String> phoneRequest) {
        try {
            String phoneNumber = phoneRequest.get("phoneNumber");
            String code = phoneRequest.get("code");

            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                Map<String, Object> res = new HashMap<>();
                res.put("success", false);
                res.put("message", "전화번호가 필요합니다.");
                return ResponseEntity.badRequest().body(res);
            }

            // 통신 서버 URL 조합
            String requestOtpUrl = communicationServerUrl + "/sms/request-otp";
            String verifyOtpUrl = communicationServerUrl + "/sms/verify-otp";

            if (code == null || code.trim().isEmpty()) {
                // OTP 발송 요청
                Map<String, String> payload = new HashMap<>();
                payload.put("phone", phoneNumber);
                @SuppressWarnings("unchecked")
                Map<String, Object> result = restTemplate.postForObject(requestOtpUrl, payload, Map.class);

                boolean success = result != null && Boolean.TRUE.equals(result.get("success"));
                Map<String, Object> res = new HashMap<>();
                res.put("success", success);
                res.put("message", success ? "인증 코드가 발송되었습니다." : (result != null ? result.getOrDefault("message", "인증 코드 발송에 실패했습니다.") : "인증 코드 발송에 실패했습니다."));
                if (result != null && result.get("expiresIn") != null) {
                    res.put("expiresIn", result.get("expiresIn"));
                }
                return ResponseEntity.ok(res);
            } else {
                // OTP 검증 요청
                Map<String, String> payload = new HashMap<>();
                payload.put("phone", phoneNumber);
                payload.put("code", code);
                @SuppressWarnings("unchecked")
                Map<String, Object> result = restTemplate.postForObject(verifyOtpUrl, payload, Map.class);

                boolean success = result != null && Boolean.TRUE.equals(result.get("success"));

                // 검증 성공 시, 로그인 사용자라면 프로필에 전화번호 저장(선택 사항)
                if (success) {
                    try {
                        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                        if (authentication != null && authentication.isAuthenticated()) {
                            String authName = authentication.getName();
                            User user = null;
                            if (authName.contains(":")) {
                                String[] parts = authName.split(":");
                                if (parts.length == 2) {
                                    user = userService.findByOAuth2ProviderAndOAuth2Id(parts[0], parts[1]).orElse(null);
                                }
                            } else {
                                try { user = userService.findById(Long.parseLong(authName)).orElse(null);} catch (NumberFormatException ignored) {}
                            }
                            if (user != null) {
                                user.setPhoneNumber(phoneNumber);
                                userService.save(user);
                            }
                        }
                    } catch (Exception ignored) {}
                }

                Map<String, Object> res = new HashMap<>();
                res.put("success", success);
                res.put("message", success ? "인증이 완료되었습니다." : (result != null ? result.getOrDefault("message", "인증 실패") : "인증 실패"));
                res.put("verified", success);
                return ResponseEntity.ok(res);
            }
        } catch (Exception e) {
            Map<String, Object> res = new HashMap<>();
            res.put("success", false);
            res.put("message", "휴대폰 인증 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(res);
        }
    }

    // Quick Tunnel 동적 OAuth 리다이렉트 URL 업데이트
    @PostMapping("/update-oauth-redirect")
    public ResponseEntity<?> updateOAuthRedirectUrl(@RequestBody Map<String, String> request) {
        try {
            String baseUrl = request.get("baseUrl");
            String provider = request.get("provider");
            
            if (baseUrl == null || provider == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "baseUrl과 provider가 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 현재 요청의 baseUrl 정보를 HTTP 세션에 저장
            HttpServletRequest httpRequest = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
            httpRequest.getSession().setAttribute("dynamicBaseUrl", baseUrl);
            httpRequest.getSession().setAttribute("requestedProvider", provider);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "OAuth 리다이렉트 URL이 업데이트되었습니다.");
            response.put("redirectUrl", baseUrl + "/login/oauth2/code/" + provider);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "OAuth 리다이렉트 URL 업데이트 실패: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }



    @GetMapping("/profile")
    @RateLimit(bucketName = "profileBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> getUserProfile() {
        try {
            System.err.println("🔍 Profile API - 요청 도달");
            System.err.println("🔍 Profile API - 요청 시간: " + java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul")));
            
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            System.err.println("🔍 Profile API - Authentication: " + authentication);
            System.err.println("🔍 Profile API - isAuthenticated: " + (authentication != null ? authentication.isAuthenticated() : "null"));
            
            if (authentication == null || !authentication.isAuthenticated()) {
                System.err.println("🔍 Profile API - 인증되지 않은 사용자");
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "인증되지 않은 사용자입니다.");
                return ResponseEntity.status(401).body(response);
            }
            
            // JWT 토큰에서 provider와 oauthId 가져오기
            String token = null;
            try {
                // HttpServletRequest를 통해 Authorization 헤더에서 JWT 토큰 가져오기
                HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
                String bearerToken = request.getHeader("Authorization");
                System.err.println("🔍 Profile API - Authorization 헤더: " + (bearerToken != null ? "존재" : "없음"));
                
                if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
                    token = bearerToken.substring(7);
                    System.err.println("🔍 Profile API - JWT 토큰 추출 성공 (길이: " + token.length() + ")");
                } else {
                    System.err.println("🔍 Profile API - JWT 토큰 추출 실패");
                }
            } catch (Exception e) {
                System.err.println("🔍 Profile API - JWT 토큰 추출 중 예외: " + e.getMessage());
            }
            
            User user = null;
            String pictureFromToken = null;
            String provider = null;
            String oauthId = null;
            
            if (token != null) {
                try {
                    provider = jwtTokenProvider.getProviderFromToken(token);
                    oauthId = jwtTokenProvider.getOAuthIdFromToken(token);
                    pictureFromToken = jwtTokenProvider.getPictureFromToken(token);
                    
                    System.out.println("=== JWT 토큰에서 추출한 정보 ===");
                    System.out.println("Provider: " + provider);
                    System.out.println("OAuthId: " + oauthId);
                    System.out.println("Picture: " + pictureFromToken);
                    
                    if (provider != null && !"local".equals(provider) && oauthId != null) {
                        // 소셜 로그인 정보로 사용자 조회
                        System.out.println("소셜 로그인 사용자 조회 시도: " + provider + " / " + oauthId);
                        user = userService.findByOAuth2ProviderAndOAuth2Id(provider, oauthId)
                                .orElse(null);
                        
                        if (user != null) {
                            System.out.println("소셜 로그인 사용자 찾음: " + user.getId() + " / " + user.getEmail());
                        } else {
                            System.out.println("소셜 로그인 사용자를 찾을 수 없음");
                            // 캐시 문제일 수 있으므로 직접 DB 조회 시도
                            System.out.println("캐시 문제 가능성, 직접 DB 조회 시도");
                            user = userService.findByOAuth2ProviderAndOAuth2Id(provider, oauthId)
                                    .orElse(null);
                            if (user != null) {
                                System.out.println("직접 DB 조회로 사용자 찾음: " + user.getId());
                            }
                        }
                    } else if ("local".equals(provider)) {
                        // 일반 로그인은 사용자 ID로 조회
                        String userId = authentication.getName();
                        System.out.println("일반 로그인 사용자 조회: " + userId);
                        user = userService.findById(Long.parseLong(userId))
                                .orElse(null);
                    }
                } catch (Exception e) {
                    log.error("JWT에서 로그인 정보 추출 실패: {}", e.getMessage(), e);
                }
            }
            
            // 조회 실패 시 추가 시도
            if (user == null) {
                System.out.println("=== 사용자 조회 실패, 추가 시도 ===");
                
                // 1. authentication.getName()으로 시도
                String authName = authentication.getName();
                System.out.println("Authentication name: " + authName);
                
                // OAuth2 사용자의 경우 "provider:oauthId" 형태일 수 있음
                if (authName.contains(":")) {
                    String[] parts = authName.split(":");
                    if (parts.length == 2) {
                        String authProvider = parts[0];
                        String authOAuthId = parts[1];
                        System.out.println("OAuth2 식별자 분해: provider=" + authProvider + ", oauthId=" + authOAuthId);
                        
                        user = userService.findByOAuth2ProviderAndOAuth2Id(authProvider, authOAuthId)
                                .orElse(null);
                        if (user != null) {
                            System.out.println("OAuth2 식별자로 사용자 찾음: " + user.getId());
                        }
                    }
                } else {
                    // 숫자인 경우 user ID로 시도
                    try {
                        Long userId = Long.parseLong(authName);
                        user = userService.findById(userId).orElse(null);
                        if (user != null) {
                            System.out.println("User ID로 사용자 찾음: " + user.getId());
                        }
                    } catch (NumberFormatException e) {
                        // 숫자가 아닌 경우 oauthId일 가능성이 있음
                        System.out.println("Authentication name이 숫자가 아님, oauthId일 가능성");
                        
                        // 현재 로그인한 provider 정보가 있다면 시도
                        if (provider != null && authName != null) {
                            user = userService.findByOAuth2ProviderAndOAuth2Id(provider, authName)
                                    .orElse(null);
                            if (user != null) {
                                System.out.println("Provider + authName으로 사용자 찾음: " + user.getId());
                            }
                        }
                    }
                }
                
                // 2. 여전히 실패한 경우 에러 처리
                if (user == null) {
                    System.out.println("모든 방법으로 사용자 조회 실패");
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "사용자를 찾을 수 없습니다. 다시 로그인해주세요.");
                    return ResponseEntity.status(404).body(response);
                }
            }
            
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("email", user.getEmail());
            userData.put("name", user.getName());
            
            // Provider 정보 설정 - JWT 토큰에서 가져온 provider 우선 사용
            String finalProvider = provider != null ? provider : user.getOauthProvider();
            if (finalProvider == null || finalProvider.isEmpty()) {
                finalProvider = "local"; // 기본값으로 local 설정
            }
            userData.put("provider", finalProvider);
            
            // 추가 정보 포함
            userData.put("height", user.getHeight());
            userData.put("weight", user.getWeight());
            userData.put("age", user.getAge());
            userData.put("gender", user.getGender());
            userData.put("phoneNumber", user.getPhoneNumber());
            userData.put("birthDate", user.getBirthDate());

            // 닉네임 포함
            userData.put("nickname", user.getNickname() != null ? user.getNickname() : "");

            // 프로필 사진 우선순위: JWT 토큰 > DB 저장된 이미지 > null
            String profileImage = pictureFromToken != null ? pictureFromToken : user.getProfileImage();
            userData.put("picture", profileImage);
            
            System.out.println("=== 최종 사용자 정보 ===");
            System.out.println("User ID: " + user.getId());
            System.out.println("Email: " + user.getEmail());
            System.out.println("Name: " + user.getName());
            System.out.println("Provider: " + finalProvider);
            System.out.println("OAuth ID: " + user.getOauthId());
            System.out.println("Height: " + user.getHeight());
            System.out.println("Weight: " + user.getWeight());
            System.out.println("Age: " + user.getAge());
            System.out.println("Gender: " + user.getGender());
            System.out.println("Phone Number: " + user.getPhoneNumber());
            System.out.println("Birth Date: " + user.getBirthDate());
            System.out.println("Picture: " + profileImage);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", userData);
            
            System.err.println("🔍 Profile API - 성공 응답 전송");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("getUserProfile 예외 발생: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "사용자 정보 조회 실패: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        try {
            // Authorization 헤더에서 JWT 토큰 추출
            String bearerToken = request.getHeader("Authorization");
            if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
                String token = bearerToken.substring(7);
                
                // 토큰을 무효화 (블랙리스트에 추가하거나 서버에서 무효화)
                // 여기서는 간단히 토큰 검증만 수행
                if (jwtTokenProvider.validateToken(token)) {
                    // 토큰이 유효하면 무효화 처리
                    // 실제 구현에서는 Redis나 DB에 블랙리스트 저장
                    System.out.println("로그아웃: 토큰 무효화 처리됨");
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "로그아웃 성공");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("로그아웃 처리 중 오류: " + e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "로그아웃 처리 중 오류가 발생했습니다.");
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/test-env")
    public ResponseEntity<?> testEnv() {
        String envValue = System.getenv().getOrDefault("ALLOW_SOCIAL_AUTO_SIGNUP", "not_set");
        boolean parsed = Boolean.parseBoolean(envValue);
        Map<String, Object> response = new HashMap<>();
        response.put("envValue", envValue);
        response.put("parsedValue", parsed);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/save-onboarding-profile")
    @RateLimit(bucketName = "profileUpdateBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> saveOnboardingProfile(@RequestBody Map<String, String> onboardingRequest) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "인증되지 않은 사용자입니다.");
                return ResponseEntity.status(401).body(response);
            }

            // 사용자 찾기
            User user = null;
            String authName = authentication.getName();
            System.out.println("Authentication name: " + authName);

            // OAuth2 사용자의 경우 "provider:oauthId" 형태일 수 있음
            if (authName.contains(":")) {
                String[] parts = authName.split(":");
                if (parts.length == 2) {
                    String authProvider = parts[0];
                    String authOAuthId = parts[1];
                    System.out.println("OAuth2 식별자 분해: provider=" + authProvider + ", oauthId=" + authOAuthId);
                    
                    user = userService.findByOAuth2ProviderAndOAuth2Id(authProvider, authOAuthId)
                            .orElse(null);
                }
            } else {
                // 숫자인 경우 user ID로 시도
                try {
                    Long userId = Long.parseLong(authName);
                    user = userService.findById(userId).orElse(null);
                } catch (NumberFormatException e) {
                    System.out.println("Authentication name이 숫자가 아님");
                }
            }

            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "사용자를 찾을 수 없습니다.");
                return ResponseEntity.status(404).body(response);
            }

            // 온보딩 데이터 전체 업데이트
            String goal = onboardingRequest.get("goal");
            String experience = onboardingRequest.get("experience");
            String height = onboardingRequest.get("height");
            String weight = onboardingRequest.get("weight");
            String age = onboardingRequest.get("age");
            String gender = onboardingRequest.get("gender");
            String phoneNumber = onboardingRequest.get("phoneNumber");

            if (goal != null) user.setGoal(goal);
            if (experience != null) user.setExperience(experience);
            if (height != null) user.setHeight(height);
            if (weight != null) user.setWeight(weight);
            if (age != null) user.setAge(age);
            if (gender != null) user.setGender(gender);
            if (phoneNumber != null) user.setPhoneNumber(phoneNumber);

            // 사용자 정보 저장
            userService.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "온보딩 프로필이 완전히 저장되었습니다.");
            response.put("user", Map.of(
                "id", user.getId(),
                "goal", user.getGoal() != null ? user.getGoal() : "",
                "experience", user.getExperience() != null ? user.getExperience() : "",
                "height", user.getHeight() != null ? user.getHeight() : "",
                "weight", user.getWeight() != null ? user.getWeight() : "",
                "age", user.getAge() != null ? user.getAge() : "",
                "gender", user.getGender() != null ? user.getGender() : "",
                "phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : ""
            ));
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("온보딩 프로필 저장 중 오류: " + e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "온보딩 프로필 저장에 실패했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PutMapping("/update-basic-info")
    @RateLimit(bucketName = "profileUpdateBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> updateBasicInfo(@RequestBody Map<String, String> basicInfoRequest) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "인증되지 않은 사용자입니다.");
                return ResponseEntity.status(401).body(response);
            }

            // 사용자 찾기
            User user = null;
            String authName = authentication.getName();
            System.out.println("Authentication name: " + authName);

            // OAuth2 사용자의 경우 "provider:oauthId" 형태일 수 있음
            if (authName.contains(":")) {
                String[] parts = authName.split(":");
                if (parts.length == 2) {
                    String authProvider = parts[0];
                    String authOAuthId = parts[1];
                    System.out.println("OAuth2 식별자 분해: provider=" + authProvider + ", oauthId=" + authOAuthId);
                    
                    user = userService.findByOAuth2ProviderAndOAuth2Id(authProvider, authOAuthId)
                            .orElse(null);
                }
            } else {
                // 숫자인 경우 user ID로 시도
                try {
                    Long userId = Long.parseLong(authName);
                    user = userService.findById(userId).orElse(null);
                } catch (NumberFormatException e) {
                    System.out.println("Authentication name이 숫자가 아님");
                }
            }

            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "사용자를 찾을 수 없습니다.");
                return ResponseEntity.status(404).body(response);
            }

            // 기본 정보 업데이트 (기존 로직 유지 - 하위 호환성)
            String height = basicInfoRequest.get("height");
            String weight = basicInfoRequest.get("weight");
            String age = basicInfoRequest.get("age");
            String gender = basicInfoRequest.get("gender");
            String phoneNumber = basicInfoRequest.get("phoneNumber");

            if (height != null) user.setHeight(height);
            if (weight != null) user.setWeight(weight);
            if (age != null) user.setAge(age);
            if (gender != null) user.setGender(gender);
            if (phoneNumber != null) user.setPhoneNumber(phoneNumber);

            // 사용자 정보 저장
            userService.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "기본 정보가 업데이트되었습니다.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("기본 정보 업데이트 중 오류: " + e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "기본 정보 업데이트에 실패했습니다.");
            return ResponseEntity.status(500).body(response);
        }
    }

    // 신규: 비밀번호 검증 (프로필 수정 진입 시)
    @PostMapping("/verify-password")
    @RateLimit(bucketName = "profileUpdateBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> verifyPassword(@RequestBody Map<String, String> request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "인증 필요"));
            }
            String authName = authentication.getName();
            User user = null;
            if (authName.contains(":")) {
                String[] parts = authName.split(":");
                if (parts.length == 2) {
                    user = userService.findByOAuth2ProviderAndOAuth2Id(parts[0], parts[1]).orElse(null);
                }
            } else {
                try { user = userService.findById(Long.parseLong(authName)).orElse(null);} catch (NumberFormatException ignored) {}
            }
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "사용자를 찾을 수 없습니다."));
            }
            if (user.getPassword() == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "소셜 로그인 계정은 비밀번호가 없습니다."));
            }
            String password = request.get("password");
            if (password == null || password.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "비밀번호를 입력해주세요."));
            }
            boolean matches = passwordEncoder.matches(password, user.getPassword());
            if (!matches) {
                return ResponseEntity.ok(Map.of("success", false, "message", "비밀번호가 일치하지 않습니다."));
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "검증 성공"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "검증 중 오류: " + e.getMessage()));
        }
    }

    // 신규: 프로필 업데이트 (허용 필드만)
    @PutMapping("/update-profile")
    @RateLimit(bucketName = "profileUpdateBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> req) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "인증 필요"));
            }
            String authName = authentication.getName();
            User user = null;
            if (authName.contains(":")) {
                String[] parts = authName.split(":");
                if (parts.length == 2) {
                    user = userService.findByOAuth2ProviderAndOAuth2Id(parts[0], parts[1]).orElse(null);
                }
            } else {
                try { user = userService.findById(Long.parseLong(authName)).orElse(null);} catch (NumberFormatException ignored) {}
            }
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "사용자를 찾을 수 없습니다."));
            }

            // 고유키/권한 관련 필드 제외하고 갱신
            if (req.containsKey("name")) user.setName(req.get("name"));
            if (req.containsKey("nickname")) user.setNickname(req.get("nickname"));
            if (req.containsKey("phoneNumber")) user.setPhoneNumber(req.get("phoneNumber"));
            if (req.containsKey("birthDate")) user.setBirthDate(req.get("birthDate"));
            if (req.containsKey("height")) user.setHeight(req.get("height"));
            if (req.containsKey("weight")) user.setWeight(req.get("weight"));
            if (req.containsKey("age")) user.setAge(req.get("age"));
            if (req.containsKey("gender")) user.setGender(req.get("gender"));

            userService.save(user);
            return ResponseEntity.ok(Map.of("success", true, "message", "프로필이 업데이트되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "프로필 업데이트 실패: " + e.getMessage()));
        }
    }

    // 신규: 비밀번호 변경
    @PostMapping("/change-password")
    @RateLimit(bucketName = "profileUpdateBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> req) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "인증 필요"));
            }
            String authName = authentication.getName();
            User user = null;
            if (authName.contains(":")) {
                String[] parts = authName.split(":");
                if (parts.length == 2) {
                    user = userService.findByOAuth2ProviderAndOAuth2Id(parts[0], parts[1]).orElse(null);
                }
            } else {
                try { user = userService.findById(Long.parseLong(authName)).orElse(null);} catch (NumberFormatException ignored) {}
            }
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "사용자를 찾을 수 없습니다."));
            }
            if (user.getPassword() == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "소셜 로그인 계정은 비밀번호가 없습니다."));
            }
            String currentPassword = req.get("currentPassword");
            String newPassword = req.get("newPassword");
            if (currentPassword == null || currentPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "현재/새 비밀번호를 입력해주세요."));
            }
            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "현재 비밀번호가 올바르지 않습니다."));
            }
            if (currentPassword.equals(newPassword)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "새 비밀번호는 현재 비밀번호와 달라야 합니다."));
            }
            // 제약조건: 8자 이상, 특수문자/대문자/숫자 포함
            if (newPassword.length() < 8 || !newPassword.matches(".*[^a-zA-Z0-9].*") || !newPassword.matches(".*[A-Z].*") || !newPassword.matches(".*[0-9].*")) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "비밀번호는 8자 이상이며 특수문자, 대문자, 숫자를 포함해야 합니다."));
            }
            if (user.getEmail() != null) {
                String local = user.getEmail().split("@")[0];
                if (newPassword.contains(local)) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "이메일과 유사한 비밀번호는 사용할 수 없습니다."));
                }
            }
            user.setPassword(passwordEncoder.encode(newPassword));
            userService.save(user);
            return ResponseEntity.ok(Map.of("success", true, "message", "비밀번호가 변경되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "비밀번호 변경 실패: " + e.getMessage()));
        }
    }

    // 인바디 상세 정보 업데이트 엔드포인트 제거 (더 이상 사용하지 않음)


} 