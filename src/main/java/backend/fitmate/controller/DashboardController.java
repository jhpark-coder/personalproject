package backend.fitmate.controller;

import java.util.Arrays;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.config.RateLimit;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    // 통합 대시보드 API - 하나의 토큰으로 모든 데이터 제공
    @GetMapping("/data")
    @RateLimit(bucketName = "dashboardBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> getDashboardData() {
        // 목표 데이터
        Map<String, Object> goalData = Map.of(
            "title", "신체 능력 향상 시키기",
            "subtitle", "건강한 몸매와 운동수행능력 UP",
            "current", 1,
            "total", 3,
            "progress", 33.33
        );

        // 운동 통계 데이터
        Map<String, Object> workoutStats = Map.of(
            "time", "3시간 13분",
            "volume", "27.4 ton",
            "count", "6회",
            "comparison", "+2시간 47분",
            "chartData", Arrays.asList(
                Map.of("week", "~05-03", "value", 20),
                Map.of("week", "~05-10", "value", 30),
                Map.of("week", "~05-17", "value", 25),
                Map.of("week", "~05-24", "value", 40),
                Map.of("week", "~05-31", "value", 80)
            )
        );

        // 추천 데이터
        Map<String, Object> recommendation = Map.of(
            "title", "신체 능력 강화 중급 A",
            "description", "총 4종목·18세트",
            "icon", "🏋️‍♂️",
            "tooltip", "무슨 운동을 할지 모르겠다면 추천 루틴을 활용해보세요."
        );

        // 통합 응답
        Map<String, Object> dashboardData = Map.of(
            "goal", goalData,
            "stats", workoutStats,
            "recommendation", recommendation
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", dashboardData
        ));
    }

    // 기존 개별 API들은 유지 (하위 호환성)
    @GetMapping("/goal")
    @RateLimit(bucketName = "dashboardBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> getGoalData() {
        // 임시 데이터 - 실제로는 데이터베이스에서 가져와야 함
        Map<String, Object> goalData = Map.of(
            "title", "신체 능력 향상 시키기",
            "subtitle", "건강한 몸매와 운동수행능력 UP",
            "current", 1,
            "total", 3,
            "progress", 33.33
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "goal", goalData
        ));
    }

    @GetMapping("/workout-stats")
    @RateLimit(bucketName = "dashboardBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> getWorkoutStats() {
        // 임시 데이터 - 실제로는 데이터베이스에서 가져와야 함
        Map<String, Object> workoutStats = Map.of(
            "time", "3시간 13분",
            "volume", "27.4 ton",
            "count", "6회",
            "comparison", "+2시간 47분",
            "chartData", Arrays.asList(
                Map.of("week", "~05-03", "value", 20),
                Map.of("week", "~05-10", "value", 30),
                Map.of("week", "~05-17", "value", 25),
                Map.of("week", "~05-24", "value", 40),
                Map.of("week", "~05-31", "value", 80)
            )
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "stats", workoutStats
        ));
    }

    @GetMapping("/recommendation")
    @RateLimit(bucketName = "dashboardBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> getRecommendation() {
        // 임시 데이터 - 실제로는 AI 추천 알고리즘 사용
        Map<String, Object> recommendation = Map.of(
            "title", "신체 능력 강화 중급 A",
            "description", "총 4종목·18세트",
            "icon", "🏋️‍♂️",
            "tooltip", "무슨 운동을 할지 모르겠다면 추천 루틴을 활용해보세요."
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "recommendation", recommendation
        ));
    }
} 