package backend.fitmate.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.User.entity.SessionFeedback;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.repository.SessionFeedbackRepository;
import backend.fitmate.User.repository.UserRepository;
import backend.fitmate.User.repository.WorkoutSessionRepository;
import backend.fitmate.User.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
@Slf4j
public class UserController {

    private final UserRepository userRepository;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;
    
    @Autowired
    private SessionFeedbackRepository sessionFeedbackRepository;

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "인증이 필요합니다"
            ));
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null && a.getAuthority().contains("ROLE_ADMIN"));
        if (!isAdmin) {
            return ResponseEntity.status(403).body(Map.of(
                "success", false,
                "message", "관리자만 접근 가능합니다"
            ));
        }

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));

        Page<User> src = userRepository.findAll(pageable);
        List<User> filtered;
        if (!StringUtils.hasText(q)) {
            filtered = src.getContent();
        } else {
            String query = q.toLowerCase();
            filtered = src.getContent().stream()
                .filter(u -> (u.getEmail() != null && u.getEmail().toLowerCase().contains(query))
                          || (u.getName() != null && u.getName().toLowerCase().contains(query)))
                .collect(Collectors.toList());
        }

        List<Map<String, Object>> content = filtered.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("name", u.getName());
            m.put("birthDate", u.getBirthDate());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("content", content);
        body.put("page", src.getNumber());
        body.put("size", src.getSize());
        body.put("totalElements", src.getTotalElements());
        body.put("totalPages", src.getTotalPages());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    // ===== 전체 사용자 ID 목록 (관리자 전용) =====
    @GetMapping("/ids")
    public ResponseEntity<?> getAllUserIds() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "인증이 필요합니다"
            ));
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null && a.getAuthority().contains("ROLE_ADMIN"));
        if (!isAdmin) {
            return ResponseEntity.status(403).body(Map.of(
                "success", false,
                "message", "관리자만 접근 가능합니다"
            ));
        }

        List<Map<String, Object>> result = userRepository.findAll().stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("name", u.getName());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ===== 스케줄러용: 관리자를 제외한 모든 사용자 목록 (인증 불필요) =====
    @GetMapping("/all")
    public ResponseEntity<?> getAllUsersExceptAdmins() {
        try {
            List<Map<String, Object>> result = userRepository.findAll().stream()
                .filter(u -> u.getRole() == null || !u.getRole().contains("ROLE_ADMIN"))
                .map(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", u.getId());
                    m.put("email", u.getEmail());
                    m.put("name", u.getName());
                    m.put("role", u.getRole());
                    return m;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "사용자 목록 조회 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }
    
    /**
     * 사용자 프로필 조회
     */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<?> getUserProfile(@PathVariable Long userId) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "인증이 필요합니다"
                ));
            }
            
            User user = userService.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "사용자를 찾을 수 없습니다"
                ));
            }
            
            Map<String, Object> userProfile = new HashMap<>();
            userProfile.put("id", user.getId());
            userProfile.put("email", user.getEmail());
            userProfile.put("name", user.getName());
            userProfile.put("goal", user.getGoal());
            userProfile.put("experience", user.getExperience());
            userProfile.put("weight", user.getWeight());
            userProfile.put("height", user.getHeight());
            userProfile.put("age", user.getAge());
            userProfile.put("gender", user.getGender());
            userProfile.put("phoneNumber", user.getPhoneNumber());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "user", userProfile
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "사용자 프로필 조회 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }
    
    /**
     * 사용자 운동 피드백 데이터 조회
     */
    @GetMapping("/{userId}/workout-feedback")
    public ResponseEntity<?> getUserWorkoutFeedback(
            @PathVariable Long userId, 
            @RequestParam(defaultValue = "14") int days) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "인증이 필요합니다"
                ));
            }
            
            User user = userService.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "사용자를 찾을 수 없습니다"
                ));
            }
            
            // 최근 피드백 데이터를 직접 조회 (세션 LAZY 로딩 회피)
            LocalDateTime fromDate = LocalDateTime.now().minusDays(days);
            List<SessionFeedback> feedbacks = sessionFeedbackRepository.findRecentFeedback(user, fromDate);
            
            if (feedbacks == null || feedbacks.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "feedback", null,
                    "message", "최근 " + days + "일간 운동 피드백이 없습니다"
                ));
            }
            
            // 피드백 통계 계산 (Null 안전 처리)
            double avgSatisfaction = feedbacks.stream()
                    .map(SessionFeedback::getSatisfaction)
                    .filter(v -> v != null)
                    .mapToInt(Integer::intValue)
                    .average()
                    .orElse(3.0);
            
            double avgDifficulty = feedbacks.stream()
                    .map(SessionFeedback::getOverallDifficulty)
                    .filter(v -> v != null)
                    .mapToInt(Integer::intValue)
                    .average()
                    .orElse(3.0);
            
            double avgCompletionRate = feedbacks.stream()
                    .map(SessionFeedback::getCompletionRate)
                    .filter(v -> v != null)
                    .mapToDouble(BigDecimal::doubleValue)
                    .average()
                    .orElse(0.8);
            
            double wouldRepeatRatio = feedbacks.stream()
                    .map(SessionFeedback::getWouldRepeat)
                    .filter(v -> v != null)
                    .mapToDouble(v -> v ? 1.0 : 0.0)
                    .average()
                    .orElse(0.8);
            
            Map<String, Object> feedbackSummary = new HashMap<>();
            feedbackSummary.put("avgSatisfaction", Math.round(avgSatisfaction * 10.0) / 10.0);
            feedbackSummary.put("avgDifficulty", Math.round(avgDifficulty * 10.0) / 10.0);
            feedbackSummary.put("avgCompletionRate", Math.round(avgCompletionRate * 1000.0) / 1000.0);
            feedbackSummary.put("recentSessionCount", feedbacks.size());
            feedbackSummary.put("wouldRepeatRatio", Math.round(wouldRepeatRatio * 100.0) / 100.0);
            
            String recentDifficulty;
            if (avgDifficulty >= 4.0) {
                recentDifficulty = "too_hard";
            } else if (avgDifficulty <= 2.0) {
                recentDifficulty = "too_easy";
            } else {
                recentDifficulty = "appropriate";
            }
            feedbackSummary.put("recentDifficulty", recentDifficulty);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "feedback", feedbackSummary
            ));
            
        } catch (Exception e) {
            log.error("운동 피드백 조회 중 오류 발생: userId={}, days={}, error={}", userId, days, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "운동 피드백 조회 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }
} 