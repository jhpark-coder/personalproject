package backend.fitmate.domain.notification.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.user.service.UserService;
import backend.fitmate.domain.notification.service.DailyWorkoutNotificationService;
import lombok.extern.slf4j.Slf4j;

/**
 * 알림 테스트 컨트롤러
 * 개발/테스트용 - 프로덕션에서는 비활성화 권장
 */
@RestController
@RequestMapping("/api/test/notification")
@CrossOrigin(origins = "*")
@Slf4j
public class NotificationTestController {
    
    @Autowired
    private DailyWorkoutNotificationService dailyNotificationService;
    
    @Autowired
    private UserService userService;
    
    /**
     * 현재 사용자에게 테스트 알림 발송
     */
    @PostMapping("/send-test")
    public ResponseEntity<?> sendTestNotification(Authentication authentication) {
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
            
            log.info("테스트 알림 발송 시작 - userId: {}", user.getId());
            
            // 테스트 알림 발송
            dailyNotificationService.sendTestNotification(user.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "테스트 알림이 발송되었습니다. SMS와 웹 알림을 확인해주세요.");
            response.put("userId", user.getId());
            response.put("phoneNumber", user.getPhoneNumber() != null ? 
                user.getPhoneNumber().substring(0, 3) + "****" + 
                user.getPhoneNumber().substring(user.getPhoneNumber().length() - 4) : 
                "등록된 번호 없음");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("테스트 알림 발송 실패: ", e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "알림 발송 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }
}