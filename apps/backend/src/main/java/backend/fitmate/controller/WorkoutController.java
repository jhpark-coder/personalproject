package backend.fitmate.controller;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.config.RateLimit;

@RestController
@RequestMapping("/api/workout")
@CrossOrigin(origins = "*")
public class WorkoutController {

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
} 