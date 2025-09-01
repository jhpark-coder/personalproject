package backend.fitmate.controller;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.Exercise.entity.Exercise;
import backend.fitmate.Exercise.repository.ExerciseRepository;
import backend.fitmate.User.entity.WorkoutRecord;
import backend.fitmate.User.service.WorkoutRecordService;
import backend.fitmate.config.RateLimit;

@RestController
@RequestMapping("/test")
@CrossOrigin(origins = "*")
public class TestController {

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private WorkoutRecordService workoutRecordService;

    // 테스트용 로그인 엔드포인트 (분당 5회 제한)
    @PostMapping("/login")
    @RateLimit(bucketName = "loginBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> testLogin() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "로그인 테스트 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    // 테스트용 회원가입 엔드포인트 (분당 3회 제한)
    @PostMapping("/signup")
    @RateLimit(bucketName = "signupBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> testSignup() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "회원가입 테스트 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    // 테스트용 이메일 인증 엔드포인트 (분당 2회 제한)
    @PostMapping("/email-verification")
    @RateLimit(bucketName = "emailVerificationBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> testEmailVerification() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "이메일 인증 테스트 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    // 테스트용 OAuth2 엔드포인트 (분당 10회 제한)
    @PostMapping("/oauth2")
    @RateLimit(bucketName = "oauth2Bucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> testOAuth2() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "OAuth2 테스트 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    // Rate Limiting 테스트용 간단한 GET 엔드포인트
    @GetMapping("/rate-limit-test")
    @RateLimit(bucketName = "loginBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> rateLimitTest() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Rate Limiting 테스트 성공 - 분당 5회 제한");
        response.put("timestamp", System.currentTimeMillis());
        response.put("remainingRequests", "확인하려면 브라우저에서 반복 접속해보세요");
        return ResponseEntity.ok(response);
    }

    // Rate Limiting 상태 확인용 엔드포인트 (제한 없음)
    @GetMapping("/status")
    public ResponseEntity<?> status() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "서버 정상 동작 중");
        response.put("rateLimiting", "활성화됨");
        response.put("testEndpoints", Map.of(
            "login", "POST /test/login (분당 5회)",
            "signup", "POST /test/signup (분당 3회)", 
            "email", "POST /test/email-verification (분당 2회)",
            "oauth2", "POST /test/oauth2 (분당 10회)",
            "test", "GET /test/rate-limit-test (분당 5회)",
            "loginPage", "GET /test/login-page (분당 10회)"
        ));
        return ResponseEntity.ok(response);
    }

    // 로그인 페이지 접근 테스트 (분당 10회 제한)
    @GetMapping("/login-page")
    @RateLimit(bucketName = "loginPageBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> loginPageTest() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "로그인 페이지 접근 성공 - Rate Limiting 적용됨");
        response.put("timestamp", System.currentTimeMillis());
        response.put("remainingRequests", "분당 10회 제한");
        return ResponseEntity.ok(response);
    }

    // 운동 데이터 확인 엔드포인트
    @GetMapping("/exercises")
    public ResponseEntity<?> getExercises() {
        try {
            List<Exercise> exercises = exerciseRepository.findAll();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("totalCount", exercises.size());
                                        response.put("exercises", exercises.stream().limit(20).map(exercise -> (Map<String, Object>) new HashMap<String, Object>() {{
                put("id", exercise.getId());
                put("name", exercise.getName());
                put("category", exercise.getCategory());
                put("mets", exercise.getMets());
                put("intensity", exercise.getIntensity());
                put("muscles", exercise.getMuscles());
                put("equipment", exercise.getEquipment());
            }}).toList());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "운동 데이터 조회 실패: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // MET 값이 있는 운동들만 조회
    @GetMapping("/exercises/with-mets")
    public ResponseEntity<?> getExercisesWithMets() {
        try {
            List<Exercise> allExercises = exerciseRepository.findAll();
            List<Exercise> exercisesWithMets = allExercises.stream()
                .filter(exercise -> exercise.getMets() != null)
                .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("totalCount", allExercises.size());
            response.put("exercisesWithMetsCount", exercisesWithMets.size());
                                        response.put("exercises", exercisesWithMets.stream().limit(50).map(exercise -> (Map<String, Object>) new HashMap<String, Object>() {{
                put("id", exercise.getId());
                put("name", exercise.getName());
                put("category", exercise.getCategory());
                put("mets", exercise.getMets());
                put("intensity", exercise.getIntensity());
                put("muscles", exercise.getMuscles());
                put("equipment", exercise.getEquipment());
            }}).toList());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "MET 데이터 조회 실패: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // 테스트용 사용자 운동 기록 생성 (MET 값 포함)
    @PostMapping("/create-test-workouts/{userId}")
    public ResponseEntity<?> createTestWorkouts(@PathVariable Long userId) {
        try {
            // MET 값이 있는 운동들 목록
            String[] workoutTypesWithMets = {
                "스쿼트", "런지", "푸시업", "플랭크", "크런치", "조깅", "달리기", 
                "자전거", "수영", "걷기", "등산", "골프", "볼링", "요가", "필라테스",
                "바벨 스쿼트", "덤벨 스쿼트", "레그 프레스", "바벨 벤치프레스", 
                "덤벨 벤치프레스", "바벨 로우", "덤벨 로우", "풀업", "바벨 바이셉 컬",
                "해머 컬", "트라이셉 익스텐션", "딥스", "러시안 트위스트", 
                "바이시클 크런치", "레그 레이즈", "마운틴 클라이머", "버피", 
                "점핑잭", "AB 롤아웃", "덤벨 바디 로테이션", "케틀벨 스윙",
                "세라밴드 운동", "TRX 운동", "EMS 트레이닝"
            };
            
            // 각 운동의 MET 값
            Double[] metsValues = {
                6.0, 4.0, 3.8, 2.5, 3.0, 7.0, 9.0, 
                7.0, 8.0, 3.5, 6.0, 4.5, 3.0, 2.5, 3.0,
                7.0, 6.0, 6.0, 7.0, 
                6.0, 6.0, 5.0, 6.0, 6.0,
                5.0, 4.0, 6.0, 4.0, 
                4.0, 3.0, 8.0, 10.0, 
                8.0, 8.0, 8.0, 5.0,
                8.0, 3.0, 7.0, 7.0
            };
            
            // 최근 30일간의 운동 기록 생성
            LocalDate startDate = LocalDate.now().minusDays(30);
            LocalDate endDate = LocalDate.now();
            Random random = new Random();
            
            int createdCount = 0;
            LocalDate currentDate = startDate;
            
            while (!currentDate.isAfter(endDate)) {
                // 하루에 1-2개의 운동 기록 생성
                int dailyWorkouts = random.nextInt(2) + 1;
                
                for (int i = 0; i < dailyWorkouts; i++) {
                    // MET 값이 있는 운동 중에서 랜덤 선택
                    int exerciseIndex = random.nextInt(workoutTypesWithMets.length);
                    String selectedExercise = workoutTypesWithMets[exerciseIndex];
                    Double mets = metsValues[exerciseIndex];
                    
                    // 운동 기록 생성
                    WorkoutRecord record = new WorkoutRecord();
                    record.setWorkoutDate(currentDate);
                    record.setWorkoutType(selectedExercise);
                    record.setDuration(30 + random.nextInt(90)); // 30-120분
                    
                    // MET 값을 사용해서 칼로리 계산 (기본 체중 70kg)
                    double weight = 70.0;
                    int durationHours = record.getDuration() / 60;
                    int calculatedCalories = (int) (mets * weight * durationHours);
                    record.setCalories(calculatedCalories);
                    
                    // MET 값에 따른 강도 설정
                    int intensity;
                    if (mets < 3.0) {
                        intensity = 1 + random.nextInt(3); // 1-3 (낮음)
                    } else if (mets < 6.0) {
                        intensity = 4 + random.nextInt(3); // 4-6 (보통)
                    } else {
                        intensity = 7 + random.nextInt(4); // 7-10 (높음)
                    }
                    record.setIntensity(intensity);
                    
                    // 난이도 설정
                    WorkoutRecord.WorkoutDifficulty difficulty;
                    if (intensity <= 3) {
                        difficulty = WorkoutRecord.WorkoutDifficulty.EASY;
                    } else if (intensity <= 6) {
                        difficulty = WorkoutRecord.WorkoutDifficulty.MODERATE;
                    } else {
                        difficulty = WorkoutRecord.WorkoutDifficulty.HARD;
                    }
                    record.setDifficulty(difficulty);
                    
                    // 웨이트 운동인 경우 추가 정보
                    if (selectedExercise.contains("바벨") || selectedExercise.contains("덤벨") || 
                        selectedExercise.contains("레그") || selectedExercise.contains("벤치")) {
                        record.setSets(3 + random.nextInt(5)); // 3-7세트
                        record.setReps(8 + random.nextInt(12)); // 8-19회
                        record.setWeight(20.0 + random.nextDouble() * 80.0); // 20-100kg
                    }
                    
                    record.setNotes("MET: " + mets + ", 계산된 칼로리: " + calculatedCalories + " kcal");
                    
                    // 운동 기록 저장
                    workoutRecordService.saveWorkoutRecord(userId, record);
                    createdCount++;
                }
                
                currentDate = currentDate.plusDays(1);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "테스트 운동 기록 생성 완료");
            response.put("createdCount", createdCount);
            response.put("period", startDate + " ~ " + endDate);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "테스트 운동 기록 생성 실패: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
} 