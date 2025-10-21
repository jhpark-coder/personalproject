package backend.fitmate.domain.user.controller;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.domain.user.entity.BodyRecord;
import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.workout.entity.WorkoutRecord;
import backend.fitmate.domain.user.repository.UserRepository;
import backend.fitmate.domain.user.service.BodyRecordService;
import backend.fitmate.domain.user.service.UserService;
import backend.fitmate.domain.workout.service.WorkoutRecordService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/mypage")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MyPageController {

    private final UserService userService;
    private final WorkoutRecordService workoutRecordService;
    private final BodyRecordService bodyRecordService;
    private final UserRepository userRepository;

    /**
     * 마이페이지 대시보드 데이터 조회
     */
    @GetMapping("/{userId}/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData(@PathVariable Long userId) {
        try {
            Map<String, Object> dashboardData = new HashMap<>();
            
            // 사용자 정보
            Optional<User> userOpt = userService.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            dashboardData.put("user", userOpt.get());
            
            // 최근 30일 기간 설정
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(30);
            
            // 최근 운동 기록 (최근 10개)
            List<WorkoutRecord> recentWorkouts = workoutRecordService.getRecentWorkoutRecords(userId);
            dashboardData.put("recentWorkouts", recentWorkouts);
            
            // 최근 신체 기록 (최근 5개)
            List<BodyRecord> recentBodyRecords = bodyRecordService.getRecentBodyRecords(userId);
            dashboardData.put("recentBodyRecords", recentBodyRecords);
            
            // 월별 운동 통계
            Object[] monthlyWorkoutStats = workoutRecordService.getMonthlyWorkoutStats(userId, startDate, endDate);
            dashboardData.put("monthlyWorkoutStats", monthlyWorkoutStats);
            
            // 월별 신체 변화 통계
            Object[] monthlyBodyStats = bodyRecordService.getMonthlyBodyStats(userId, startDate, endDate);
            dashboardData.put("monthlyBodyStats", monthlyBodyStats);
            
            // 운동 난이도 분포
            List<Object[]> difficultyDistribution = workoutRecordService.getDifficultyDistribution(userId, startDate, endDate);
            dashboardData.put("difficultyDistribution", difficultyDistribution);
            
            // 운동 종류별 통계
            List<Object[]> workoutTypeStats = workoutRecordService.getWorkoutTypeStats(userId, startDate, endDate);
            dashboardData.put("workoutTypeStats", workoutTypeStats);
            
            return ResponseEntity.ok(dashboardData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 월별 변화 추이 데이터 조회
     */
    @GetMapping("/{userId}/trends")
    public ResponseEntity<Map<String, Object>> getTrendsData(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "daily") String period) {
        try {
            // 로깅 추가
            System.out.println("=== Trends API 호출 ===");
            System.out.println("userId: " + userId);
            System.out.println("startDate: " + startDate);
            System.out.println("endDate: " + endDate);
            System.out.println("period: " + period);
            
            // 사용자 존재 여부 확인
            if (!userService.findById(userId).isPresent()) {
                System.err.println("=== 사용자 없음 ===");
                System.err.println("userId " + userId + "를 찾을 수 없습니다.");
                return ResponseEntity.notFound().build();
            }
            
            // 각 기간별로 올바른 날짜 범위 계산
            LocalDate calculatedStartDate, calculatedEndDate;
            LocalDate today = LocalDate.now();
            
            switch (period) {
                case "daily":
                    // 일별: 최근 5일
                    calculatedEndDate = today;
                    calculatedStartDate = today.minusDays(4);
                    break;
                    
                case "weekly":
                    // 주별: 최근 4주
                    calculatedEndDate = today;
                    calculatedStartDate = today.minusWeeks(3);
                    break;
                    
                case "monthly":
                    // 월별: 최근 3개월
                    calculatedEndDate = today;
                    calculatedStartDate = today.minusMonths(2);
                    break;
                    
                default:
                    // 기본값: 일별
                    calculatedEndDate = today;
                    calculatedStartDate = today.minusDays(4);
            }
            
            // 프론트엔드에서 날짜를 보냈다면 그것을 우선 사용
            if (startDate != null && endDate != null) {
                calculatedStartDate = startDate;
                calculatedEndDate = endDate;
            }
            
            System.out.println("=== 계산된 날짜 범위 ===");
            System.out.println("calculatedStartDate: " + calculatedStartDate);
            System.out.println("calculatedEndDate: " + calculatedEndDate);
            
            // 날짜 유효성 검사
            if (calculatedStartDate.isAfter(calculatedEndDate)) {
                System.err.println("=== 날짜 오류 ===");
                System.err.println("startDate가 endDate보다 늦습니다: " + calculatedStartDate + " > " + calculatedEndDate);
                return ResponseEntity.badRequest().body(Map.of("error", "시작 날짜가 종료 날짜보다 늦습니다."));
            }
            
            Map<String, Object> trendsData = new HashMap<>();
            
            switch (period) {
                case "daily":
                    // 일별: 계산된 범위(기본 최근 5일)
                    trendsData.put("weightTrend", bodyRecordService.getWeightTrend(userId, calculatedStartDate, calculatedEndDate));
                    trendsData.put("bodyFatTrend", bodyRecordService.getBodyFatTrend(userId, calculatedStartDate, calculatedEndDate));
                    trendsData.put("muscleMassTrend", bodyRecordService.getMuscleMassTrend(userId, calculatedStartDate, calculatedEndDate));
                    break;
                    
                case "weekly":
                    // 주별: 계산된 범위(기본 최근 4주)
                    trendsData.put("weightTrend", bodyRecordService.getWeightTrendWeekly(userId, calculatedStartDate, calculatedEndDate));
                    trendsData.put("bodyFatTrend", bodyRecordService.getBodyFatTrendWeekly(userId, calculatedStartDate, calculatedEndDate));
                    trendsData.put("muscleMassTrend", bodyRecordService.getMuscleMassTrendWeekly(userId, calculatedStartDate, calculatedEndDate));
                    break;
                    
                case "monthly":
                    // 월별: 계산된 범위(기본 최근 3개월)
                    trendsData.put("weightTrend", bodyRecordService.getWeightTrendMonthly(userId, calculatedStartDate, calculatedEndDate));
                    trendsData.put("bodyFatTrend", bodyRecordService.getBodyFatTrendMonthly(userId, calculatedStartDate, calculatedEndDate));
                    trendsData.put("muscleMassTrend", bodyRecordService.getMuscleMassTrendMonthly(userId, calculatedStartDate, calculatedEndDate));
                    break;
                    
                default:
                    // 기본값: 일별 (계산된 범위 적용)
                    trendsData.put("weightTrend", bodyRecordService.getWeightTrend(userId, calculatedStartDate, calculatedEndDate));
                    trendsData.put("bodyFatTrend", bodyRecordService.getBodyFatTrend(userId, calculatedStartDate, calculatedEndDate));
                    trendsData.put("muscleMassTrend", bodyRecordService.getMuscleMassTrend(userId, calculatedStartDate, calculatedEndDate));
            }
            
            System.out.println("=== 응답 데이터 ===");
            System.out.println("trendsData: " + trendsData);
            
            return ResponseEntity.ok(trendsData);
        } catch (Exception e) {
            System.err.println("=== 에러 발생 ===");
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 운동 기록 상세 조회
     */
    @GetMapping("/{userId}/workouts")
    public ResponseEntity<Map<String, Object>> getWorkoutRecords(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            Map<String, Object> workoutData = new HashMap<>();
            
            List<WorkoutRecord> workouts;
            if (startDate != null && endDate != null) {
                workouts = workoutRecordService.getUserWorkoutRecordsByPeriod(userId, startDate, endDate);
            } else {
                workouts = workoutRecordService.getUserWorkoutRecords(userId);
            }
            
            workoutData.put("workouts", workouts);
            workoutData.put("totalCount", workouts.size());
            
            return ResponseEntity.ok(workoutData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 신체 기록 상세 조회
     */
    @GetMapping("/{userId}/body-records")
    public ResponseEntity<Map<String, Object>> getBodyRecords(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            Map<String, Object> bodyData = new HashMap<>();
            
            List<BodyRecord> bodyRecords;
            if (startDate != null && endDate != null) {
                bodyRecords = bodyRecordService.getUserBodyRecordsByPeriod(userId, startDate, endDate);
            } else {
                bodyRecords = bodyRecordService.getUserBodyRecords(userId);
            }
            
            bodyData.put("bodyRecords", bodyRecords);
            bodyData.put("totalCount", bodyRecords.size());
            
            return ResponseEntity.ok(bodyData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 종합 분석 리포트
     */
    @GetMapping("/{userId}/report")
    public ResponseEntity<Map<String, Object>> getAnalysisReport(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            Map<String, Object> report = new HashMap<>();
            
            // 사용자 정보
            Optional<User> userOpt = userService.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            report.put("user", userOpt.get());
            
            // 기간 정보
            report.put("analysisPeriod", Map.of(
                "startDate", startDate,
                "endDate", endDate,
                "days", java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1
            ));
            
            // 운동 통계
            Object[] workoutStats = workoutRecordService.getMonthlyWorkoutStats(userId, startDate, endDate);
            report.put("workoutStats", workoutStats);
            
            // 신체 변화 통계
            Object[] bodyStats = bodyRecordService.getMonthlyBodyStats(userId, startDate, endDate);
            report.put("bodyStats", bodyStats);
            
            // 운동 난이도 분포
            List<Object[]> difficultyDistribution = workoutRecordService.getDifficultyDistribution(userId, startDate, endDate);
            report.put("difficultyDistribution", difficultyDistribution);
            
            // 운동 종류별 통계
            List<Object[]> workoutTypeStats = workoutRecordService.getWorkoutTypeStats(userId, startDate, endDate);
            report.put("workoutTypeStats", workoutTypeStats);
            
            // 변화 추이
            List<Object[]> weightTrend = bodyRecordService.getWeightTrend(userId, startDate, endDate);
            report.put("weightTrend", weightTrend);
            
            List<Object[]> bodyFatTrend = bodyRecordService.getBodyFatTrend(userId, startDate, endDate);
            report.put("bodyFatTrend", bodyFatTrend);
            
            List<Object[]> muscleMassTrend = bodyRecordService.getMuscleMassTrend(userId, startDate, endDate);
            report.put("muscleMassTrend", muscleMassTrend);
            
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{userId}/records-room")
    public ResponseEntity<Map<String, Object>> getRecordsRoomSummary(@PathVariable Long userId) {
        try {
            if (userService.findById(userId).isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<WorkoutRecord> all = workoutRecordService.getUserWorkoutRecords(userId);
            Map<String, Object> pr = new HashMap<>();
            Map<String, Object> streak = new HashMap<>();
            Map<String, Object> cumulative = new HashMap<>();

            double maxVolume = 0.0; WorkoutRecord maxVolumeRec = null;
            int maxReps = 0; WorkoutRecord maxRepsRec = null;
            int longestDuration = 0; WorkoutRecord longestDurationRec = null;

            long totalCalories = 0;
            double totalVolume = 0.0;
            long totalMinutes = 0;
            int totalWorkouts = all.size();

            // PR 및 누적 통계 계산
            for (WorkoutRecord r : all) {
                if (r.getCalories() != null) totalCalories += r.getCalories();
                if (r.getDuration() != null) totalMinutes += r.getDuration();

                // 볼륨: sets * reps * weight (null은 0으로 간주)
                int sets = r.getSets() != null ? r.getSets() : 0;
                int reps = r.getReps() != null ? r.getReps() : 0;
                double weight = r.getWeight() != null ? r.getWeight() : 0.0;
                double volume = (double) sets * reps * weight;
                totalVolume += volume;

                if (volume > maxVolume) { maxVolume = volume; maxVolumeRec = r; }
                if (reps > maxReps) { maxReps = reps; maxRepsRec = r; }
                if (r.getDuration() != null && r.getDuration() > longestDuration) { longestDuration = r.getDuration(); longestDurationRec = r; }
            }

            Map<String, Object> maxVolumeObj = new HashMap<>();
            if (maxVolumeRec != null) {
                maxVolumeObj.put("workoutType", maxVolumeRec.getWorkoutType());
                maxVolumeObj.put("date", maxVolumeRec.getWorkoutDate());
                maxVolumeObj.put("volume", Math.round(maxVolume * 10.0) / 10.0);
            }
            Map<String, Object> maxRepsObj = new HashMap<>();
            if (maxRepsRec != null) {
                maxRepsObj.put("workoutType", maxRepsRec.getWorkoutType());
                maxRepsObj.put("date", maxRepsRec.getWorkoutDate());
                maxRepsObj.put("reps", maxReps);
                maxRepsObj.put("sets", maxRepsRec.getSets());
            }
            Map<String, Object> longestDurationObj = new HashMap<>();
            if (longestDurationRec != null) {
                longestDurationObj.put("workoutType", longestDurationRec.getWorkoutType());
                longestDurationObj.put("date", longestDurationRec.getWorkoutDate());
                longestDurationObj.put("minutes", longestDuration);
            }
            pr.put("maxVolume", maxVolumeObj);
            pr.put("maxReps", maxRepsObj);
            pr.put("longestDuration", longestDurationObj);

            // 연속 운동 일수 계산 (현재 streak, 최장 streak)
            int currentStreak = 0, longestStreak = 0;
            java.util.Set<LocalDate> days = new java.util.HashSet<>();
            for (WorkoutRecord r : all) days.add(r.getWorkoutDate());
            LocalDate today = LocalDate.now();
            LocalDate cursor = today;
            while (days.contains(cursor)) { currentStreak++; cursor = cursor.minusDays(1); }
            // 최장 streak 계산
            LocalDate minDate = all.stream().map(WorkoutRecord::getWorkoutDate).min(LocalDate::compareTo).orElse(today);
            LocalDate d = minDate;
            while (!d.isAfter(today)) {
                int s = 0; LocalDate c = d;
                while (days.contains(c)) { s++; c = c.minusDays(1); }
                if (s > longestStreak) longestStreak = s;
                d = d.plusDays(1);
            }
            streak.put("current", currentStreak);
            streak.put("longest", longestStreak);

            cumulative.put("totalCalories", totalCalories);
            cumulative.put("totalVolume", Math.round(totalVolume * 10.0) / 10.0);
            cumulative.put("totalWorkouts", totalWorkouts);
            cumulative.put("totalMinutes", totalMinutes);

            Map<String, Object> result = new HashMap<>();
            result.put("pr", pr);
            result.put("streak", streak);
            result.put("cumulative", cumulative);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "인증이 필요합니다");
            return ResponseEntity.status(401).body(response);
        }

        // 간단 권한 체크: SecurityContext에 저장된 Principal의 권한 문자열 포함 여부로 판단
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null && a.getAuthority().contains("ROLE_ADMIN"));
        if (!isAdmin) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "관리자만 접근 가능합니다");
            return ResponseEntity.status(403).body(response);
        }

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));

        // 간단한 검색: 이메일 또는 이름에 q가 포함되는 사용자
        Page<User> resultPage;
        if (!StringUtils.hasText(q)) {
            resultPage = userRepository.findAll(pageable);
        } else {
            // repository에 동적 메소드가 없으므로 메모리 필터링 (데이터가 많아지면 Specification/Query 필요)
            Page<User> all = userRepository.findAll(pageable);
            List<User> filtered = all.getContent().stream()
                .filter(u -> (u.getEmail() != null && u.getEmail().toLowerCase().contains(q.toLowerCase()))
                          || (u.getName() != null && u.getName().toLowerCase().contains(q.toLowerCase())))
                .collect(Collectors.toList());
            resultPage = new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
        }

        List<Map<String, Object>> content = resultPage.getContent().stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("name", u.getName());
            m.put("birthDate", u.getBirthDate());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("content", content);
        body.put("page", resultPage.getNumber());
        body.put("size", resultPage.getSize());
        body.put("totalElements", resultPage.getTotalElements());
        body.put("totalPages", resultPage.getTotalPages());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }
} 