package backend.fitmate.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.auth.dto.LoginRequest;
import backend.fitmate.auth.dto.SignupRequest;
import backend.fitmate.config.JwtCookieService;
import backend.fitmate.config.JwtTokenProvider;
import backend.fitmate.config.RateLimit;
import backend.fitmate.user.entity.User;
import backend.fitmate.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${app.frontend.url}", allowCredentials = "true")
@Validated
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private JwtCookieService jwtCookieService;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    @RateLimit(bucketName = "loginBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletResponse httpResponse) {
        String email = loginRequest.getEmail().trim();
        String password = loginRequest.getPassword();

        try {
            Optional<User> userOpt = userService.findByEmail(email);
            if (userOpt.isEmpty()) {
                return badRequest("Invalid email or password.");
            }

            User user = userOpt.get();
            if (user.getPassword() == null || !passwordEncoder.matches(password, user.getPassword())) {
                return badRequest("Invalid email or password.");
            }

            String token = jwtTokenProvider.createToken(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getOauthProvider(),
                user.getOauthId(),
                user.getProfileImage(),
                user.getRole()
            );
            jwtCookieService.addAuthCookie(httpResponse, token);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful.");
            response.put("user", toUserData(user, user.getOauthProvider()));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Login failed.");
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/signup")
    @RateLimit(bucketName = "signupBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest signupRequest) {
        String email = signupRequest.getEmail().trim();
        String password = signupRequest.getPassword();
        String nickname = signupRequest.getNickname();
        String name = signupRequest.getName().trim();
        String birthDate = signupRequest.getBirthDate().trim();
        String gender = signupRequest.getGender();
        String phoneNumber = signupRequest.getPhoneNumber().trim();
        String goal = signupRequest.getGoal();

        try {
            User user = userService.signup(email, password, nickname, name, birthDate, gender, phoneNumber, goal);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Signup completed.");
            response.put("user", toSignupUserData(user));

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return badRequest(e.getMessage());
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Signup failed.");
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        boolean exists = userService.isEmailExists(email);

        Map<String, Object> response = new HashMap<>();
        response.put("available", !exists);
        response.put("message", exists ? "Email already exists." : "Email is available.");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-phone")
    public ResponseEntity<?> verifyPhone(@RequestBody Map<String, String> phoneRequest) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Verification code sent.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    @RateLimit(bucketName = "profileBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> getUserProfile() {
        try {
            Optional<User> userOpt = getAuthenticatedUser();
            if (userOpt.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not found.");
                return ResponseEntity.status(404).body(response);
            }

            User user = userOpt.get();
            String provider = user.getOauthProvider();
            if (provider == null || provider.isEmpty()) {
                provider = "local";
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", toUserData(user, provider));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to load user profile.");
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse httpResponse) {
        try {
            String bearerToken = request.getHeader("Authorization");
            if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
                String token = bearerToken.substring(7).trim();
                if (!token.isBlank() && !"null".equalsIgnoreCase(token) && !"undefined".equalsIgnoreCase(token)) {
                    jwtTokenProvider.validateToken(token);
                }
            }
            jwtCookieService.clearAuthCookie(httpResponse);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Logout successful.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Logout failed.");
            return ResponseEntity.status(500).body(response);
        }
    }

    @PutMapping("/update-basic-info")
    @RateLimit(bucketName = "profileUpdateBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> updateBasicInfo(@RequestBody Map<String, String> basicInfoRequest) {
        try {
            Optional<User> userOpt = getAuthenticatedUser();
            if (userOpt.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not found.");
                return ResponseEntity.status(404).body(response);
            }

            User user = userOpt.get();
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

            userService.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Basic information updated.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to update basic information.");
            return ResponseEntity.status(500).body(response);
        }
    }

    private Optional<User> getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        String authName = authentication.getName();
        if (authName == null || authName.isBlank() || "anonymousUser".equals(authName)) {
            return Optional.empty();
        }

        if (authName.contains(":")) {
            String[] parts = authName.split(":", 2);
            return userService.findByOAuth2ProviderAndOAuth2Id(parts[0], parts[1]);
        }

        try {
            return userService.findById(Long.parseLong(authName));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private Map<String, Object> toUserData(User user, String provider) {
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("email", user.getEmail());
        userData.put("name", user.getName());
        userData.put("nickname", user.getNickname() != null ? user.getNickname() : "");
        userData.put("emailVerified", user.isEmailVerified());
        userData.put("provider", provider != null && !provider.isEmpty() ? provider : "local");
        userData.put("picture", user.getProfileImage());
        userData.put("height", user.getHeight());
        userData.put("weight", user.getWeight());
        userData.put("age", user.getAge());
        userData.put("gender", user.getGender());
        userData.put("phoneNumber", user.getPhoneNumber());
        userData.put("birthDate", user.getBirthDate());
        userData.put("role", user.getRole());
        return userData;
    }

    private Map<String, Object> toSignupUserData(User user) {
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("email", user.getEmail());
        userData.put("name", user.getName());
        userData.put("nickname", user.getNickname() != null ? user.getNickname() : "");
        userData.put("birthDate", user.getBirthDate());
        userData.put("gender", user.getGender() != null ? user.getGender() : "");
        userData.put("phoneNumber", user.getPhoneNumber());
        userData.put("goal", user.getGoal() != null ? user.getGoal() : "general");
        userData.put("emailVerified", user.isEmailVerified());
        return userData;
    }

    private ResponseEntity<?> badRequest(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return ResponseEntity.badRequest().body(response);
    }
}
