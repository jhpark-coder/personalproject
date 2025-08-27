package backend.fitmate.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
public class WorkoutController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;

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
     * 운동 세션 피드백 데이터 수신 및 저장
     */
    @PostMapping("/session-feedback")
    @RateLimit(bucketName = "workoutSessionBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> receiveSessionFeedback(@RequestBody Map<String, Object> sessionData) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "인증이 필요합니다."
                ));
            }

            // 사용자 찾기
            User user = findUserFromAuthentication(authentication);
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "사용자를 찾을 수 없습니다."
                ));
            }

            // 세션 데이터 파싱 및 검증
            String exerciseType = (String) sessionData.get("exerciseType");
            String startTimeStr = (String) sessionData.get("startTime");
            String endTimeStr = (String) sessionData.get("endTime");
            Integer totalReps = (Integer) sessionData.get("totalReps");
            Double averageFormScore = (Double) sessionData.get("averageFormScore");
            @SuppressWarnings("unchecked")
            List<String> formCorrections = (List<String>) sessionData.get("formCorrections");
            Integer duration = (Integer) sessionData.get("duration");
            Integer caloriesBurned = (Integer) sessionData.get("caloriesBurned");

            if (exerciseType == null || startTimeStr == null || totalReps == null || duration == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "필수 데이터가 누락되었습니다."
                ));
            }

            // 시간 파싱
            LocalDateTime startTime = LocalDateTime.parse(startTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            LocalDateTime endTime = endTimeStr != null ? 
                LocalDateTime.parse(endTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME) : 
                LocalDateTime.now();

            // WorkoutSession 생성 및 저장
            WorkoutSession session = WorkoutSession.builder()
                .user(user)
                .goal(user.getGoal() != null ? user.getGoal() : "fitness") // 사용자 목표 또는 기본값
                .plannedDuration(duration / 60) // 초를 분으로 변환
                .actualDuration(duration / 60)
                .sessionDate(startTime)
                .build();

            // ExerciseExecution 생성
            ExerciseExecution execution = ExerciseExecution.builder()
                .session(session)
                .exerciseName(exerciseType)
                .completedSets(totalReps > 0 ? Math.max(1, totalReps / 10) : 0) // 대략적인 세트 추정
                .completedReps(totalReps)
                .actualDuration(duration)
                .perceivedExertion(averageFormScore != null ? 
                    Math.min(10, Math.max(1, (int) Math.round(averageFormScore * 5 + 5))) : null) // 0-1 스케일을 1-10으로 변환
                .build();

            session.addExerciseExecution(execution);

            // SessionFeedback 생성 (자동 생성된 피드백)
            SessionFeedback feedback = SessionFeedback.builder()
                .session(session)
                .completionRate(BigDecimal.valueOf(Math.min(1.0, averageFormScore != null ? averageFormScore : 0.8)))
                .overallDifficulty(3) // 기본 적당함으로 설정
                .satisfaction(averageFormScore != null && averageFormScore > 0.7 ? 4 : 3) // 자세가 좋으면 만족도 높게
                .energyAfter(3) // 기본값
                .muscleSoreness(2) // 기본값  
                .wouldRepeat(true) // 기본적으로 긍정적
                .comments(formCorrections != null && !formCorrections.isEmpty() ? 
                    "자세 교정 포인트: " + String.join(", ", formCorrections) : 
                    "모션 코치를 통한 자동 기록")
                .build();

            session.setSessionFeedback(feedback);

            // 데이터베이스에 저장
            WorkoutSession savedSession = workoutSessionRepository.save(session);

            // 성공 응답
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "운동 세션 데이터가 성공적으로 저장되었습니다.");
            response.put("sessionId", savedSession.getId());
            response.put("totalReps", totalReps);
            response.put("duration", duration);
            response.put("caloriesBurned", caloriesBurned);
            response.put("averageFormScore", averageFormScore);
            response.put("formCorrectionsCount", formCorrections != null ? formCorrections.size() : 0);

            System.out.println("✅ 운동 세션 저장 완료 - 사용자: " + user.getId() + ", 세션ID: " + savedSession.getId() + ", 운동: " + exerciseType);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ 세션 피드백 저장 중 오류: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "세션 데이터 저장 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }

    /**
     * Authentication에서 사용자 찾기 (기존 AuthController 로직 재사용)
     */
    private User findUserFromAuthentication(Authentication authentication) {
        try {
            String authName = authentication.getName();
            
            // OAuth2 사용자의 경우 "provider:oauthId" 형태일 수 있음
            if (authName.contains(":")) {
                String[] parts = authName.split(":");
                if (parts.length == 2) {
                    String authProvider = parts[0];
                    String authOAuthId = parts[1];
                    return userService.findByOAuth2ProviderAndOAuth2Id(authProvider, authOAuthId)
                            .orElse(null);
                }
            } else {
                // 숫자인 경우 user ID로 시도
                try {
                    Long userId = Long.parseLong(authName);
                    return userService.findById(userId).orElse(null);
                } catch (NumberFormatException e) {
                    return null;
                }
            }
        } catch (Exception e) {
            System.err.println("사용자 찾기 실패: " + e.getMessage());
        }
        return null;
    }

    /**
     * 통합 운동 세션 완료 처리
     */
    @PostMapping("/complete-integrated-session")
    @RateLimit(bucketName = "workoutSessionBucket", keyType = RateLimit.KeyType.USER_ID)
    public ResponseEntity<?> completeIntegratedSession(@RequestBody Map<String, Object> sessionData) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "인증이 필요합니다."
                ));
            }

            User user = findUserFromAuthentication(authentication);
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "사용자를 찾을 수 없습니다."
                ));
            }

            // 세션 데이터 추출
            String programId = (String) sessionData.get("programId");
            String programTitle = (String) sessionData.get("programTitle");
            String startTimeStr = (String) sessionData.get("startTime");
            String endTimeStr = (String) sessionData.get("endTime");
            Integer totalDuration = (Integer) sessionData.get("totalDuration");
            Integer totalReps = (Integer) sessionData.get("totalReps");
            Integer totalSets = (Integer) sessionData.get("totalSets");
            Double averageFormScore = sessionData.get("averageFormScore") != null ? 
                ((Number) sessionData.get("averageFormScore")).doubleValue() : null;
            Integer caloriesBurned = (Integer) sessionData.get("caloriesBurned");
            @SuppressWarnings("unchecked")
            List<String> formCorrections = (List<String>) sessionData.get("formCorrections");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> exerciseResults = (List<Map<String, Object>>) sessionData.get("exerciseResults");

            // 시간 파싱
            LocalDateTime startTime = LocalDateTime.parse(startTimeStr.substring(0, 19));
            LocalDateTime endTime = LocalDateTime.parse(endTimeStr.substring(0, 19));

            // WorkoutSession 생성 - 통합 세션용 특별 처리
            WorkoutSession session = WorkoutSession.builder()
                .user(user)
                .exerciseType("INTEGRATED_PROGRAM") // 통합 프로그램임을 표시
                .startTime(startTime)
                .endTime(endTime)
                .totalReps(totalReps != null ? totalReps : 0)
                .averageFormScore(averageFormScore != null ? BigDecimal.valueOf(averageFormScore) : BigDecimal.ZERO)
                .formCorrections(formCorrections != null ? formCorrections : Arrays.asList())
                .duration(totalDuration != null ? totalDuration : 0)
                .caloriesBurned(caloriesBurned != null ? BigDecimal.valueOf(caloriesBurned) : BigDecimal.ZERO)
                .build();

            // 운동 실행 데이터 추가 (각 운동별로)
            if (exerciseResults != null) {
                for (Map<String, Object> exerciseResult : exerciseResults) {
                    ExerciseExecution execution = ExerciseExecution.builder()
                        .exerciseType((String) exerciseResult.get("exerciseType"))
                        .reps(exerciseResult.get("completedReps") != null ? 
                            ((Number) exerciseResult.get("completedReps")).intValue() : 0)
                        .sets(exerciseResult.get("completedSets") != null ? 
                            ((Number) exerciseResult.get("completedSets")).intValue() : 0)
                        .formScore(exerciseResult.get("averageFormScore") != null ? 
                            BigDecimal.valueOf(((Number) exerciseResult.get("averageFormScore")).doubleValue()) : 
                            BigDecimal.ZERO)
                        .duration(exerciseResult.get("duration") != null ? 
                            ((Number) exerciseResult.get("duration")).intValue() : 0)
                        .timestamp(startTime) // 실제로는 각 운동의 실행 시간이어야 함
                        .build();
                    session.addExerciseExecution(execution);
                }
            }

            // 세션 피드백 생성 (통합 세션용)
            SessionFeedback feedback = SessionFeedback.builder()
                .overallDifficulty(3) // 기본값
                .satisfaction(averageFormScore != null && averageFormScore > 0.7 ? 4 : 3)
                .energyAfter(3)
                .muscleSoreness(2)
                .wouldRepeat(true)
                .comments(String.format("통합 운동 프로그램 완료: %s (총 %d세트, %d회)", 
                    programTitle, totalSets != null ? totalSets : 0, totalReps != null ? totalReps : 0))
                .build();

            session.setSessionFeedback(feedback);

            // 데이터베이스에 저장
            WorkoutSession savedSession = workoutSessionRepository.save(session);

            // 응답 데이터 생성
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "통합 운동 세션이 성공적으로 완료되었습니다.");
            response.put("sessionId", savedSession.getId());
            
            // 세션 분석 정보
            Map<String, Object> analysis = new HashMap<>();
            analysis.put("totalDuration", totalDuration);
            analysis.put("totalExercises", exerciseResults != null ? exerciseResults.size() : 0);
            analysis.put("totalSets", totalSets);
            analysis.put("totalReps", totalReps);
            analysis.put("caloriesBurned", caloriesBurned);
            analysis.put("averageFormScore", averageFormScore);
            analysis.put("completionRate", calculateCompletionRate(exerciseResults));
            analysis.put("performanceGrade", calculatePerformanceGrade(averageFormScore, totalSets, exerciseResults));
            
            response.put("analysis", analysis);

            // 다음 추천 (기본적인 추천 로직)
            Map<String, Object> nextRecommendation = new HashMap<>();
            nextRecommendation.put("recommendedRestDays", 1);
            nextRecommendation.put("nextProgramSuggestion", generateNextProgramSuggestion(programId, averageFormScore));
            nextRecommendation.put("improvementAreas", generateImprovementAreas(formCorrections, exerciseResults));
            
            response.put("nextRecommendation", nextRecommendation);

            System.out.println("✅ 통합 운동 세션 저장 완료 - 사용자: " + user.getId() + 
                ", 세션ID: " + savedSession.getId() + ", 프로그램: " + programTitle);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ 통합 세션 완료 처리 중 오류: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "통합 세션 완료 처리 중 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }

    /**
     * 완주율 계산
     */
    private double calculateCompletionRate(List<Map<String, Object>> exerciseResults) {
        if (exerciseResults == null || exerciseResults.isEmpty()) {
            return 0.0;
        }
        
        int totalTargetSets = 0;
        int totalCompletedSets = 0;
        
        for (Map<String, Object> result : exerciseResults) {
            Integer targetSets = result.get("targetSets") != null ? 
                ((Number) result.get("targetSets")).intValue() : 0;
            Integer completedSets = result.get("completedSets") != null ? 
                ((Number) result.get("completedSets")).intValue() : 0;
                
            totalTargetSets += targetSets;
            totalCompletedSets += completedSets;
        }
        
        return totalTargetSets > 0 ? (double) totalCompletedSets / totalTargetSets * 100 : 0.0;
    }

    /**
     * 성과 등급 계산
     */
    private String calculatePerformanceGrade(Double averageFormScore, Integer totalSets, 
            List<Map<String, Object>> exerciseResults) {
        double completionRate = calculateCompletionRate(exerciseResults);
        double formScore = averageFormScore != null ? averageFormScore : 0.0;
        
        // 완주율 60% + 폼 점수 40%로 가중 평균
        double finalScore = (completionRate * 0.6) + (formScore * 0.4);
        
        if (finalScore >= 90) return "S";
        if (finalScore >= 80) return "A";
        if (finalScore >= 70) return "B";
        if (finalScore >= 60) return "C";
        return "D";
    }

    /**
     * 다음 프로그램 제안 생성
     */
    private String generateNextProgramSuggestion(String currentProgramId, Double averageFormScore) {
        if (averageFormScore == null) {
            return "동일한 프로그램으로 연습을 계속하세요";
        }
        
        if (averageFormScore >= 0.8) {
            return switch (currentProgramId) {
                case "upper_body" -> "체력증진 (유산소) 세트로 도전해보세요";
                case "lower_body" -> "상체 단련세트로 균형있게 운동하세요";
                case "cardio" -> "하체 단련세트로 근력을 보완하세요";
                default -> "더 도전적인 운동 프로그램을 시도해보세요";
            };
        } else if (averageFormScore >= 0.6) {
            return "현재 프로그램을 조금 더 연습한 후 난이도를 높여보세요";
        } else {
            return "기본 동작을 충분히 익힌 후 다음 단계로 진행하세요";
        }
    }

    /**
     * 개선 영역 생성
     */
    private List<String> generateImprovementAreas(List<String> formCorrections, 
            List<Map<String, Object>> exerciseResults) {
        List<String> improvements = new java.util.ArrayList<>();
        
        // 자세 교정 기반 개선사항
        if (formCorrections != null && !formCorrections.isEmpty()) {
            improvements.add("자세 정확도 개선이 필요합니다");
        }
        
        // 완주율 기반 개선사항
        if (exerciseResults != null) {
            for (Map<String, Object> result : exerciseResults) {
                Integer targetSets = result.get("targetSets") != null ? 
                    ((Number) result.get("targetSets")).intValue() : 0;
                Integer completedSets = result.get("completedSets") != null ? 
                    ((Number) result.get("completedSets")).intValue() : 0;
                
                if (completedSets < targetSets) {
                    String exerciseType = (String) result.get("exerciseType");
                    improvements.add(exerciseType + " 세트 완주 연습이 필요합니다");
                }
            }
        }
        
        // 기본 개선사항
        if (improvements.isEmpty()) {
            improvements.add("꾸준한 연습으로 더욱 발전할 수 있습니다");
        }
        
        return improvements;
    }
} 