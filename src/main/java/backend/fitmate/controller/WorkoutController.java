package backend.fitmate.controller;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import backend.fitmate.User.service.WorkoutResultService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.User.dto.FullSessionFeedbackDto;
import backend.fitmate.User.entity.ExerciseExecution;
import backend.fitmate.User.entity.SessionFeedback;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.WorkoutSession;
import backend.fitmate.User.repository.WorkoutSessionRepository;
import backend.fitmate.User.service.UserService;
import backend.fitmate.config.RateLimit;

@RestController
@RequestMapping("/api/workout")
@CrossOrigin(origins = "*")
@Slf4j
public class WorkoutController {

    @Autowired
    private UserService userService;
    

    @Autowired
    private WorkoutResultService workoutResultService;

    @GetMapping("/programs")
    @RateLimit(bucketName = "workoutBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> getWorkoutPrograms() {
        // 임시 데이터 - 실제로는 데이터베이스에서 가져와야 함
        List<Map<String, Object>> programs = Arrays.asList(
            Map.of(
                "id", "beginner",
                "title", "완벽한 맨몸 운동",
                "description", "초보자 맞춤 프로그램",
                "difficulty", "초급",
                "duration", "4주",
                "frequency", "주 4회",
                "icon", "🏃‍♂️",
                "color", "#FF9500"
            ),
            Map.of(
                "id", "strong-curves",
                "title", "스트롱 커브스",
                "description", "하체 강화 프로그램",
                "difficulty", "중급",
                "duration", "8주",
                "frequency", "주 3회",
                "icon", "💪",
                "color", "#FF3B30"
            ),
            Map.of(
                "id", "strength",
                "title", "파워 빌딩",
                "description", "근력 향상 프로그램",
                "difficulty", "중급",
                "duration", "12주",
                "frequency", "주 4회",
                "icon", "🏋️‍♂️",
                "color", "#AF52DE"
            ),
            Map.of(
                "id", "pull-up",
                "title", "풀업 마스터",
                "description", "상체 강화 프로그램",
                "difficulty", "고급",
                "duration", "6주",
                "frequency", "주 3회",
                "icon", "🤸‍♂️",
                "color", "#007AFF"
            ),
            Map.of(
                "id", "endurance",
                "title", "지구력 트레이닝",
                "description", "체력 향상 프로그램",
                "difficulty", "중급",
                "duration", "8주",
                "frequency", "주 5회",
                "icon", "⚡",
                "color", "#34C759"
            )
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "programs", programs
        ));
    }

    @GetMapping("/programs/{id}")
    @RateLimit(bucketName = "workoutBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> getWorkoutProgram(@PathVariable String id) {
        // 임시 데이터 - 실제로는 데이터베이스에서 가져와야 함
        Map<String, Object> program = Map.of(
            "id", id,
            "title", "운동 프로그램 상세",
            "description", "프로그램 상세 정보",
            "exercises", Arrays.asList(
                Map.of("name", "스쿼트", "sets", 3, "reps", 10),
                Map.of("name", "푸시업", "sets", 3, "reps", 15),
                Map.of("name", "플랭크", "sets", 3, "duration", "30초")
            )
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "program", program
        ));
    }

    

    /**
     * 전체 운동 세션 피드백 데이터 수신 및 저장
     */
    @PostMapping("/full-session-feedback")
    public ResponseEntity<?> receiveFullSessionFeedback(@RequestBody FullSessionFeedbackDto fullSessionDto, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "인증이 필요합니다."));
        }

        try {
            String authName = authentication.getName();
            User user;

            // OAuth2 사용자의 경우 "provider:oauthId" 형태일 수 있음
            if (authName.contains(":")) {
                String[] parts = authName.split(":");
                if (parts.length == 2) {
                    String authProvider = parts[0];
                    String authOAuthId = parts[1];
                    user = userService.findByOAuth2ProviderAndOAuth2Id(authProvider, authOAuthId)
                            .orElse(null);
                } else {
                    user = null; // Invalid format
                }
            } else {
                // 숫자인 경우 user ID로 시도
                try {
                    Long userId = Long.parseLong(authName);
                    user = userService.findById(userId).orElse(null);
                } catch (NumberFormatException e) {
                    user = null; // Not a number, assume email or other format not handled here
                }
            }
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("success", false, "message", "사용자를 찾을 수 없습니다."));
            }

            workoutResultService.saveFullSession(user, fullSessionDto);

            return ResponseEntity.ok(Map.of("success", true, "message", "전체 운동 세션이 성공적으로 저장되었습니다."));
        } catch (Exception e) {
            log.error("전체 세션 피드백 저장 중 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "전체 세션 저장 중 오류 발생"));
        }
    }
} 