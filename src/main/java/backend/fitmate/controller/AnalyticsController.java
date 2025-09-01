package backend.fitmate.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.User.entity.ExerciseExecution;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.WorkoutSession;
import backend.fitmate.User.repository.ExerciseExecutionRepository;
import backend.fitmate.User.repository.SessionFeedbackRepository;
import backend.fitmate.User.repository.UserRepository;
import backend.fitmate.User.repository.WorkoutSessionRepository;
import backend.fitmate.config.RateLimit;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;
    @Autowired
    private SessionFeedbackRepository sessionFeedbackRepository;
    @Autowired
    private ExerciseExecutionRepository exerciseExecutionRepository;
    @Autowired
    private UserRepository userRepository;

    @GetMapping("/body")
    @RateLimit(bucketName = "analyticsBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> getBodyData() {
        // 임시 데이터 - 실제로는 데이터베이스에서 가져와야 함
        Map<String, Object> bodyData = Map.of(
            "muscleMass", Map.of(
                "current", 27.5,
                "change", 0.5,
                "min", 27.0,
                "max", 27.5,
                "data", Arrays.asList(
                    Map.of("date", "25-05-12", "value", 27.0),
                    Map.of("date", "05-19", "value", 27.2),
                    Map.of("date", "05-26", "value", 27.5)
                )
            ),
            "bodyFat", Map.of(
                "current", 16.3,
                "change", -0.7,
                "min", 16.3,
                "max", 17.0,
                "data", Arrays.asList(
                    Map.of("date", "25-05-12", "value", 17.0),
                    Map.of("date", "05-19", "value", 16.8),
                    Map.of("date", "05-26", "value", 16.3)
                )
            )
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", bodyData
        ));
    }

    @GetMapping("/stats")
    @RateLimit(bucketName = "analyticsBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> getWorkoutStats() {
        // 임시 데이터 - 실제로는 데이터베이스에서 가져와야 함
        Map<String, Object> stats = Map.of(
            "time", "7시간 51분",
            "volume", "27.4 ton",
            "count", "6회",
            "averageTime", "78분",
            "totalWeight", "27,408kg",
            "history", Arrays.asList(
                Map.of("type", "트레드밀", "count", 2)
            )
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "stats", stats
        ));
    }

    /**
     * 전일 세션/피드백/실행 기록 기반 요약 반환
     */
    @GetMapping("/daily-summary")
    @RateLimit(bucketName = "analyticsBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> getDailySummary() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("success", false, "message", "인증이 필요합니다"));
            }
            Long userId = null;
            try { userId = Long.parseLong(authentication.getName()); } catch (NumberFormatException ignored) {}
            if (userId == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "유효한 사용자 정보가 없습니다."));
            }

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "사용자를 찾을 수 없습니다"));
            }

            LocalDate yesterday = LocalDate.now().minusDays(1);
            LocalDateTime from = yesterday.atStartOfDay();
            LocalDateTime to = yesterday.atTime(LocalTime.MAX);

            // 어제 세션 조회
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
} 