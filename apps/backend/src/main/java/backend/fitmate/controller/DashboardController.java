package backend.fitmate.controller;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.user.service.WorkoutRecordService;
import backend.fitmate.config.RateLimit;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private static final Logger log = LoggerFactory.getLogger(DashboardController.class);

    @Autowired
    private WorkoutRecordService workoutRecordService;

    // 통합 대시보드 API - 하나의 토큰으로 모든 데이터 제공
    @GetMapping("/data")
    @RateLimit(bucketName = "dashboardBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> getDashboardData() {
        try {
            // JWT 인증 정보에서 사용자 ID 추출
            Long userId = null;
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                try {
                    userId = Long.parseLong(auth.getName());
                } catch (NumberFormatException ignored) {}
            }

            if (userId == null) {
                // 인증 정보가 없거나 파싱 실패 시 400 반환
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "유효한 사용자 정보가 없습니다."
                ));
            }
            
            // 목표 데이터
            Map<String, Object> goalData = Map.of(
                "title", "신체 능력 향상 시키기",
                "subtitle", "건강한 몸매와 운동수행능력 UP",
                "current", 1,
                "total", 3,
                "progress", 33.33
            );

            // 실제 운동 데이터 조회
            log.debug("Dashboard data requested: userId={}", userId);
            List<Object[]> weeklyStats = workoutRecordService.getWeeklyWorkoutStats(userId);
            List<Object[]> weeklyComparisonList = workoutRecordService.getWeeklyComparison(userId);

            log.debug("Dashboard weekly stats loaded: count={}", weeklyStats != null ? weeklyStats.size() : null);
            if (weeklyStats != null) {
                for (int i = 0; i < weeklyStats.size(); i++) {
                    Object[] stat = weeklyStats.get(i);
                    log.trace("Dashboard weekly stat[{}]={}", i, Arrays.toString(stat));
                }
            }
            log.debug("Dashboard weekly comparison loaded: hasData={}", weeklyComparisonList != null && !weeklyComparisonList.isEmpty());
            
            // 운동 통계 데이터 생성
            Map<String, Object> workoutStats = createWorkoutStats(weeklyStats, weeklyComparisonList);
            log.trace("Dashboard workout stats created: {}", workoutStats);

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
        } catch (Exception e) {
            log.warn("Dashboard data load failed.", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Failed to load dashboard data."
            ));
        }
    }

    private Map<String, Object> createWorkoutStats(List<Object[]> weeklyStats, List<Object[]> weeklyComparisonList) {
        log.trace("createWorkoutStats started: weeklyStats={}, weeklyComparison={}",
                weeklyStats != null ? weeklyStats.size() : null,
                weeklyComparisonList != null ? weeklyComparisonList.size() : null);
        
        // 이번 주 총 운동 시간과 칼로리 계산
        int thisWeekDuration = 0;
        int lastWeekDuration = 0;
        int thisWeekCalories = 0;
        int lastWeekCalories = 0;
        
        if (weeklyComparisonList != null && !weeklyComparisonList.isEmpty()) {
            Object[] weeklyComparison = weeklyComparisonList.get(0);
            log.trace("createWorkoutStats weeklyComparison={}", Arrays.toString(weeklyComparison));
            if (weeklyComparison != null && weeklyComparison.length >= 4) {
                if (weeklyComparison[0] != null) {
                    try {
                        thisWeekDuration = ((BigDecimal) weeklyComparison[0]).intValueExact();
                    } catch (ArithmeticException e) {
                        thisWeekDuration = Integer.MAX_VALUE;
                    }
                }

                if (weeklyComparison[1] != null) {
                    try {
                        lastWeekDuration = ((BigDecimal) weeklyComparison[1]).intValueExact();
                    } catch (ArithmeticException e) {
                        lastWeekDuration = Integer.MAX_VALUE;
                    }
                }

                if (weeklyComparison[2] != null) {
                    try {
                        thisWeekCalories = ((BigDecimal) weeklyComparison[2]).intValueExact();
                    } catch (ArithmeticException e) {
                        thisWeekCalories = Integer.MAX_VALUE;
                    }
                }

                if (weeklyComparison[3] != null) {
                    try {
                        lastWeekCalories = ((BigDecimal) weeklyComparison[3]).intValueExact();
                    } catch (ArithmeticException e) {
                        lastWeekCalories = Integer.MAX_VALUE;
                    }
                }

                log.trace("createWorkoutStats totals: thisWeekDuration={}, lastWeekDuration={}, thisWeekCalories={}, lastWeekCalories={}",
                        thisWeekDuration, lastWeekDuration, thisWeekCalories, lastWeekCalories);
            }
        }
        
        // 시간과 칼로리 포맷팅
        String timeStr = formatDuration(thisWeekDuration);
        String comparisonStr = formatComparison(thisWeekDuration, lastWeekDuration);
        String caloriesStr = formatCalories(thisWeekCalories);
        String caloriesComparisonStr = formatComparison(thisWeekCalories, lastWeekCalories);
        
        // 차트 데이터 생성
        List<Map<String, Object>> chartData = createChartData(weeklyStats);
        
        return Map.of(
            "time", timeStr,
            "calories", caloriesStr,
            "caloriesComparison", caloriesComparisonStr,
            "volume", "27.4 ton", // 아직 볼륨 계산 로직 없음
            "count", "6회", // 아직 횟수 계산 로직 없음
            "comparison", comparisonStr,
            "chartData", chartData
        );
    }

    private String formatDuration(int minutes) {
        if (minutes == 0) return "0분";
        
        int hours = minutes / 60;
        int remainingMinutes = minutes % 60;
        
        if (hours > 0) {
            return remainingMinutes > 0 ? 
                hours + "시간 " + remainingMinutes + "분" : 
                hours + "시간";
        } else {
            return remainingMinutes + "분";
        }
    }

    private String formatComparison(int thisWeek, int lastWeek) {
        int difference = thisWeek - lastWeek;
        
        if (difference == 0) return "변화 없음";
        
        String timeStr = formatDuration(Math.abs(difference));
        return difference > 0 ? "+" + timeStr : "-" + timeStr;
    }

    private String formatCalories(int calories) {
        if (calories == 0) return "0 kcal";
        
        if (calories >= 1000) {
            return String.format("%.1f", calories / 1000.0) + "k kcal";
        } else {
            return calories + " kcal";
        }
    }

    private List<Map<String, Object>> createChartData(List<Object[]> weeklyStats) {
        List<Map<String, Object>> chartData = new java.util.ArrayList<>();
        
        if (weeklyStats != null && !weeklyStats.isEmpty()) {
            // 최대값 찾기 (차트 높이 계산용)
            int maxDuration = weeklyStats.stream()
                .mapToInt(stat -> stat[1] != null ? ((Number) stat[1]).intValue() : 0)
                .max()
                .orElse(100);
            
            for (Object[] stat : weeklyStats) {
                int duration = stat[1] != null ? ((Number) stat[1]).intValue() : 0;
                int percentage = maxDuration > 0 ? (duration * 100) / maxDuration : 0;
                
                Map<String, Object> weekData = new HashMap<>();
                weekData.put("week", stat[0] != null ? stat[0].toString() : "");
                weekData.put("value", percentage);
                weekData.put("minutes", duration);
                chartData.add(weekData);
            }
            Collections.reverse(chartData); // 데이터 순서를 프론트엔드에 맞게 변경
        }
        
        return chartData;
    }

    private Map<String, Object> getFallbackData() {
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
            "calories", "1.2k kcal",
            "caloriesComparison", "+450 kcal",
            "volume", "27.4 ton",
            "count", "6회",
            "comparison", "+2시간 47분",
            "chartData", Arrays.asList(
                Map.of("week", "~05-03", "value", 20, "minutes", 60),
                Map.of("week", "~05-10", "value", 30, "minutes", 90),
                Map.of("week", "~05-17", "value", 25, "minutes", 75),
                Map.of("week", "~05-24", "value", 40, "minutes", 120),
                Map.of("week", "~05-31", "value", 80, "minutes", 240)
            )
        );

        // 추천 데이터
        Map<String, Object> recommendation = Map.of(
            "title", "신체 능력 강화 중급 A",
            "description", "총 4종목·18세트",
            "icon", "🏋️‍♂️",
            "tooltip", "무슨 운동을 할지 모르겠다면 추천 루틴을 활용해보세요."
        );

        return Map.of(
            "goal", goalData,
            "stats", workoutStats,
            "recommendation", recommendation
        );
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
                Map.of("week", "~05-03", "value", 20, "minutes", 60),
                Map.of("week", "~05-10", "value", 30, "minutes", 90),
                Map.of("week", "~05-17", "value", 25, "minutes", 75),
                Map.of("week", "~05-24", "value", 40, "minutes", 120),
                Map.of("week", "~05-31", "value", 80, "minutes", 240)
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
