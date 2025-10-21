package backend.fitmate.common.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.domain.workout.entity.ExerciseExecution;
import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.workout.entity.WorkoutSession;
import backend.fitmate.domain.workout.repository.WorkoutSessionRepository;
import backend.fitmate.domain.user.service.UserService;
import backend.fitmate.infrastructure.ratelimit.RateLimit;
import backend.fitmate.domain.workout.service.AdaptiveWorkoutRecommendationService;

@RestController
@RequestMapping("/api/internal")
@CrossOrigin(origins = "*")
public class InternalController {

    @Value("${app.internal.apiKey:}")
    private String internalApiKey;

    @Autowired
    private UserService userService;

    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;

    @Autowired
    private AdaptiveWorkoutRecommendationService adaptiveRecommendationService;

    private boolean isAuthorized(String headerKey) {
        if (internalApiKey == null || internalApiKey.isBlank()) {
            // 키 미설정 시 개발 편의상 허용
            return true;
        }
        return internalApiKey.equals(headerKey);
    }

    /**
     * 내부용 전일 요약 - 인증 대신 INTERNAL_API_KEY 검증 사용
     */
    @GetMapping("/analytics/daily-summary")
    @RateLimit(bucketName = "internalApiBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> getDailySummaryInternal(
            @RequestHeader(value = "X-Internal-Api-Key", required = false) String apiKey,
            @RequestParam("userId") Long userId) {
        try {
            if (!isAuthorized(apiKey)) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "UNAUTHORIZED"));
            }

            User user = userService.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "사용자를 찾을 수 없습니다"));
            }

            LocalDate yesterday = LocalDate.now().minusDays(1);
            LocalDateTime from = yesterday.atStartOfDay();
            LocalDateTime to = yesterday.atTime(LocalTime.MAX);

            List<WorkoutSession> sessions = workoutSessionRepository.findByUserAndSessionDateAfter(user, from);
            sessions.removeIf(s -> s.getSessionDate().isAfter(to));

            int totalMinutes = sessions.stream()
                .map(WorkoutSession::getActualDuration)
                .filter(v -> v != null)
                .mapToInt(Integer::intValue)
                .sum();

            int totalExercises = 0;
            int totalReps = 0;
            for (WorkoutSession s : sessions) {
                for (ExerciseExecution ex : s.getExerciseExecutions()) {
                    totalExercises++;
                    Integer sets = ex.getCompletedSets() != null ? ex.getCompletedSets() : 0;
                    Integer reps = ex.getCompletedReps() != null ? ex.getCompletedReps() : 0;
                    totalReps += sets * reps;
                }
            }

            double avgCompletion = sessions.stream()
                .map(WorkoutSession::getFeedback)
                .filter(f -> f != null && f.getCompletionRate() != null)
                .map(f -> f.getCompletionRate().doubleValue())
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

            Map<String, Object> summary = new HashMap<>();
            summary.put("date", yesterday.toString());
            summary.put("totalMinutes", totalMinutes);
            summary.put("totalExercises", totalExercises);
            summary.put("totalReps", totalReps);
            summary.put("avgCompletionRate", Math.round(avgCompletion * 100.0) / 100.0);

            return ResponseEntity.ok(Map.of("success", true, "summary", summary));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "전일 요약 생성 중 오류: " + e.getMessage()));
        }
    }

    /**
     * 내부용 적응형 추천 - userId로 사용자 지정, INTERNAL_API_KEY 검증 사용
     */
    @PostMapping("/adaptive-workout/recommend")
    @RateLimit(bucketName = "internalApiBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> getAdaptiveRecommendationInternal(
            @RequestHeader(value = "X-Internal-Api-Key", required = false) String apiKey,
            @RequestBody Map<String, Object> requestData) {
        try {
            if (!isAuthorized(apiKey)) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "UNAUTHORIZED"));
            }

            Object userIdObj = requestData.get("userId");
            if (userIdObj == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "userId가 필요합니다"));
            }
            Long userId = Long.parseLong(String.valueOf(userIdObj));
            User user = userService.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "사용자를 찾을 수 없습니다"));
            }

            Map<String, Object> recommendation = adaptiveRecommendationService.generateAdaptiveRecommendation(user, requestData);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", recommendation);
            response.put("message", "적응형 운동 추천이 완료되었습니다");
            response.put("type", "adaptive");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "적응형 추천 생성 오류: " + e.getMessage()));
        }
    }
} 