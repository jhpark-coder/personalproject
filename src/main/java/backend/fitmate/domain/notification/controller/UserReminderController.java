package backend.fitmate.domain.notification.controller;

import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.user.repository.UserRepository;
import backend.fitmate.domain.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
@Slf4j
public class UserReminderController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserService userService;

    /**
     * 매일 오전 9시 운동 알림을 받을 활성 사용자 목록 조회
     * - admin, test 계정 제외
     * - 010-2623-8769 번호만 포함
     */
    @GetMapping("/active-for-reminder")
    public ResponseEntity<List<Map<String, Object>>> getActiveUsersForReminder(
            @RequestHeader(value = "X-Internal-Service", required = false) String internalService) {
        
        // 내부 서비스 요청 검증 (통신 서버에서만 호출 가능)
        if (!"communication-server".equals(internalService)) {
            return ResponseEntity.status(403).build();
        }

        List<User> allUsers = userRepository.findAll();
        
        // 필터링: admin, test 제외, 특정 번호만 포함
        List<Map<String, Object>> filteredUsers = allUsers.stream()
            .filter(user -> {
                String name = user.getName() != null ? user.getName().toLowerCase() : "";
                String email = user.getEmail() != null ? user.getEmail().toLowerCase() : "";
                String phoneNumber = user.getPhoneNumber() != null ? user.getPhoneNumber() : "";
                
                // admin 또는 test가 포함된 계정 제외
                if (name.contains("admin") || name.contains("test")) {
                    return false;
                }
                if (email.contains("admin") || email.contains("test")) {
                    return false;
                }
                
                // 010-2623-8769만 포함
                String cleanedNumber = phoneNumber.replaceAll("[^0-9]", "");
                return "01026238769".equals(cleanedNumber) || "821026238769".equals(cleanedNumber);
            })
            .map(user -> {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", user.getId());
                userData.put("name", user.getName());
                userData.put("phoneNumber", user.getPhoneNumber());
                userData.put("email", user.getEmail());
                
                // 온보딩 데이터
                Map<String, Object> onboardingData = new HashMap<>();
                onboardingData.put("goal", user.getGoal());
                onboardingData.put("experience", user.getExperience());
                onboardingData.put("preferredExercises", new ArrayList<>());
                userData.put("onboardingData", onboardingData);
                
                // 알림 설정
                Map<String, Object> notificationSettings = new HashMap<>();
                notificationSettings.put("sms", true); // SMS 알림 활성화
                notificationSettings.put("push", true); // 푸시 알림 활성화
                userData.put("notificationSettings", notificationSettings);
                
                return userData;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(filteredUsers);
    }

    /**
     * 테스트용: 특정 사용자에게 즉시 운동 알림 발송
     */
    @PostMapping("/test-reminder/{userId}")
    public ResponseEntity<Map<String, Object>> testSendReminder(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        
        // 010-2623-8769 번호인지 확인
        String phoneNumber = user.getPhoneNumber() != null ? user.getPhoneNumber() : "";
        String cleanedNumber = phoneNumber.replaceAll("[^0-9]", "");
        
        if (!"01026238769".equals(cleanedNumber) && !"821026238769".equals(cleanedNumber)) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "테스트는 010-2623-8769 번호만 가능합니다.");
            return ResponseEntity.badRequest().body(response);
        }
        
        // 통신 서버에 테스트 알림 요청
        // 실제로는 RestTemplate이나 WebClient로 통신 서버 호출
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "테스트 알림 요청이 전송되었습니다.");
        response.put("userId", userId);
        response.put("phoneNumber", phoneNumber);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 현재 사용자의 리마인더 설정 조회
     */
    @GetMapping("/reminder")
    public ResponseEntity<?> getReminderSettings(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "인증이 필요합니다."
            ));
        }
        
        try {
            String authName = authentication.getName();
            User user = userService.findByEmail(authName)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다: " + authName));
            
            Map<String, Object> response = new HashMap<>();
            response.put("enabled", user.getReminderEnabled() != null ? user.getReminderEnabled() : false);
            response.put("time", user.getReminderTime() != null ? user.getReminderTime() : "18:00");
            response.put("days", user.getReminderDays() != null ? user.getReminderDays() : "Mon,Wed,Fri");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("리마인더 설정 조회 실패: ", e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "리마인더 설정 조회 중 오류가 발생했습니다."
            ));
        }
    }
    
    /**
     * 현재 사용자의 리마인더 설정 업데이트
     */
    @PostMapping("/reminder")
    public ResponseEntity<?> updateReminderSettings(
            @RequestBody Map<String, Object> request,
            Authentication authentication) {
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "인증이 필요합니다."
            ));
        }
        
        try {
            String authName = authentication.getName();
            User user = userService.findByEmail(authName)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다: " + authName));
            
            // 리마인더 설정 업데이트
            if (request.containsKey("enabled")) {
                user.setReminderEnabled((Boolean) request.get("enabled"));
            }
            if (request.containsKey("time")) {
                user.setReminderTime((String) request.get("time"));
            }
            if (request.containsKey("days")) {
                // 배열로 받은 요일을 쉼표로 구분된 문자열로 변환
                Object daysObj = request.get("days");
                String daysString;
                if (daysObj instanceof java.util.List) {
                    daysString = String.join(",", (java.util.List<String>) daysObj);
                } else {
                    daysString = (String) daysObj;
                }
                user.setReminderDays(daysString);
            }
            
            // 사용자 정보 저장
            userRepository.save(user);
            
            log.info("사용자 {} 리마인더 설정 업데이트 - 활성화: {}, 시간: {}, 요일: {}", 
                user.getId(), user.getReminderEnabled(), user.getReminderTime(), user.getReminderDays());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "리마인더 설정이 업데이트되었습니다.");
            response.put("enabled", user.getReminderEnabled());
            response.put("time", user.getReminderTime());
            response.put("days", user.getReminderDays());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("리마인더 설정 업데이트 실패: ", e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "리마인더 설정 업데이트 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }
}