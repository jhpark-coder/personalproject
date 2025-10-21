package backend.fitmate.domain.workout.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.domain.workout.entity.SessionFeedback;
import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.workout.entity.WorkoutSession;
import backend.fitmate.domain.user.service.UserService;
import backend.fitmate.common.dto.SessionFeedbackRequest;
import backend.fitmate.common.dto.UserFitnessProfile;
import backend.fitmate.common.dto.WorkoutSessionRequest;
import backend.fitmate.domain.workout.service.AdaptiveWorkoutRecommendationService;
import backend.fitmate.domain.workout.service.SessionFeedbackService;
import backend.fitmate.domain.user.service.UserFitnessProfileService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

/**
 * 적응형 운동 추천 및 피드백 처리 컨트롤러
 */
@RestController
@RequestMapping("/api/adaptive-workout")
@CrossOrigin(origins = "*")
@Slf4j
public class AdaptiveWorkoutController {
    
    @Autowired
    private AdaptiveWorkoutRecommendationService adaptiveRecommendationService;
    
    @Autowired
    private SessionFeedbackService feedbackService;
    
    @Autowired
    private UserFitnessProfileService profileService;
    
    @Autowired
    private UserService userService;
    
    /**
     * 적응형 운동 추천 생성
     */
    @PostMapping("/recommend")
    public ResponseEntity<Map<String, Object>> getAdaptiveRecommendation(
            @RequestBody Map<String, Object> requestData,
            Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            
            Map<String, Object> recommendation = adaptiveRecommendationService.generateAdaptiveRecommendation(user, requestData);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", recommendation);
            response.put("message", "적응형 운동 추천이 완료되었습니다");
            response.put("type", "adaptive");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("적응형 운동 추천 오류: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "적응형 운동 추천 중 오류가 발생했습니다: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * 운동 세션 시작
     */
    @PostMapping("/start-session")
    public ResponseEntity<Map<String, Object>> startSession(
            @Valid @RequestBody WorkoutSessionRequest request,
            Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            
            WorkoutSession session = feedbackService.startSession(
                user, 
                request.getGoal(), 
                request.getPlannedDuration()
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("sessionId", session.getId());
            response.put("message", "운동 세션이 시작되었습니다");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("세션 시작 오류: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "세션 시작 중 오류가 발생했습니다: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * 운동 후 피드백 제출
     */
    @PostMapping("/sessions/{sessionId}/feedback")
    public ResponseEntity<Map<String, Object>> submitFeedback(
            @PathVariable Long sessionId,
            @Valid @RequestBody SessionFeedbackRequest request,
            Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            
            // 세션 소유자 확인
            WorkoutSession session = feedbackService.getSessionWithDetails(sessionId);
            if (!session.getUser().getId().equals(user.getId())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "해당 세션에 대한 권한이 없습니다");
                return ResponseEntity.status(403).body(errorResponse);
            }
            
            // 피드백 저장 (실제 운동 시간은 별도로 받아야 함 - 여기서는 null)
            SessionFeedback feedback = feedbackService.saveFeedback(sessionId, request, null);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedbackId", feedback.getId());
            response.put("message", "피드백이 저장되었습니다. 다음 추천이 개선됩니다!");
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            
            return ResponseEntity.status(404).body(errorResponse);
            
        } catch (Exception e) {
            log.error("피드백 저장 오류: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "피드백 저장 중 오류가 발생했습니다: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * 사용자 피트니스 프로필 조회
     */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getUserProfile(Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            
            UserFitnessProfile profile = profileService.calculateProfile(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("profile", profile);
            response.put("message", "프로필 조회 완료");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("프로필 조회 오류: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "프로필 조회 중 오류가 발생했습니다: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * 사용자 세션 기록 조회
     */
    @GetMapping("/sessions")
    public ResponseEntity<Map<String, Object>> getUserSessions(Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            
            List<WorkoutSession> sessions = feedbackService.getUserSessions(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("sessions", sessions);
            response.put("totalSessions", sessions.size());
            response.put("message", "세션 기록 조회 완료");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("세션 기록 조회 오류: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "세션 기록 조회 중 오류가 발생했습니다: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * 특정 세션 상세 정보 조회
     */
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<Map<String, Object>> getSessionDetails(
            @PathVariable Long sessionId,
            Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            
            WorkoutSession session = feedbackService.getSessionWithDetails(sessionId);
            
            // 세션 소유자 확인
            if (!session.getUser().getId().equals(user.getId())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "해당 세션에 대한 권한이 없습니다");
                return ResponseEntity.status(403).body(errorResponse);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("session", session);
            response.put("message", "세션 상세 정보 조회 완료");
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            
            return ResponseEntity.status(404).body(errorResponse);
            
        } catch (Exception e) {
            log.error("세션 상세 조회 오류: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "세션 상세 조회 중 오류가 발생했습니다: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * 학습 통계 조회
     */
    @GetMapping("/learning-stats")
    public ResponseEntity<Map<String, Object>> getLearningStats(Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            
            UserFitnessProfile profile = profileService.calculateProfile(user);
            List<WorkoutSession> sessions = feedbackService.getUserSessions(user);
            
            // 통계 계산
            long totalSessions = sessions.size();
            long sessionsWithFeedback = sessions.stream()
                    .mapToLong(s -> s.getFeedback() != null ? 1 : 0)
                    .sum();
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalSessions", totalSessions);
            stats.put("sessionsWithFeedback", sessionsWithFeedback);
            stats.put("learningProgress", Math.round(profile.getConfidenceScore() * 100) + "%");
            stats.put("fitnessLevel", profile.getFitnessLevelLabel());
            stats.put("progressTrend", profile.getProgressTrendLabel());
            stats.put("motivationLevel", profile.getMotivationLevelLabel());
            stats.put("isLearningComplete", profile.getConfidenceScore() >= 0.7);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("stats", stats);
            response.put("message", "학습 통계 조회 완료");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("학습 통계 조회 오류: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "학습 통계 조회 중 오류가 발생했습니다: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    /**
     * 현재 인증된 사용자 조회
     */
    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("인증되지 않은 요청입니다");
        }
        
        String userIdStr = authentication.getName();
        try {
            Long userId = Long.parseLong(userIdStr);
            return userService.findById(userId)
                    .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다: " + userId));
        } catch (NumberFormatException e) {
            // If not a number, try as email (fallback for older tokens)
            return userService.findByEmail(userIdStr)
                    .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다: " + userIdStr));
        }
    }
}