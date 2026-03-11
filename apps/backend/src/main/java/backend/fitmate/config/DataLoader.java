package backend.fitmate.config;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Random;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import backend.fitmate.exercise.entity.Exercise;
import backend.fitmate.exercise.repository.ExerciseRepository;
import backend.fitmate.exercise.service.ExerciseService;
import backend.fitmate.user.entity.BodyRecord;
import backend.fitmate.user.entity.User;
import backend.fitmate.user.entity.WorkoutRecord;
import backend.fitmate.user.service.BodyRecordService;
import backend.fitmate.user.service.UserService;
import backend.fitmate.user.service.WorkoutRecordService;
import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class DataLoader {

    private final UserService userService;
    private final WorkoutRecordService workoutRecordService;
    private final BodyRecordService bodyRecordService;
    // Wger API 제거
    // private final WgerApiService wgerApiService;
    private final ExerciseService exerciseService;
    private final ExerciseRepository exerciseRepository;
    private final PasswordEncoder passwordEncoder;
    private final MetsDataLoader metsDataLoader;
    private final Random random = new Random();

    @Value("${data.loader.initial-data-only:false}")
    private boolean initialDataOnly;

    @Value("${data.loader.force-reset:false}")
    private boolean forceReset;

    // Wger API 호출 비활성화 플래그 제거
    // @Value("${wger.fetch.enabled:true}")
    // private boolean wgerFetchEnabled;

    @Bean
    @ConditionalOnProperty(name = "data.loader.enabled", havingValue = "true", matchIfMissing = true)
    public CommandLineRunner loadData() {
        return args -> {
            System.out.println("🚀 DataLoader 시작!");
            System.out.println("🔧 현재 활성 프로필: " + System.getProperty("spring.profiles.active"));
            System.out.println("🔧 현재 ddl-auto 설정: " + System.getProperty("spring.jpa.hibernate.ddl-auto"));
            System.out.println("🔧 초기 데이터만 로드: " + initialDataOnly);
            System.out.println("🔧 강제 리셋: " + forceReset);
            
            // 운동 데이터 로드 (데이터가 없을 때만, 또는 강제 리셋 시)
            loadInitialExercises();

            // MET 값 매핑 실행
            try {
                metsDataLoader.run();
            } catch (Exception e) {
                System.out.println("❌ MetsDataLoader 실행 중 오류: " + e.getMessage());
            }

            if (!initialDataOnly) {
                loadInitialTestData();
            } else {
                System.out.println("⏭️ 초기 데이터만 로드 모드: 테스트 데이터 생성 건너뜀");
            }
            
            System.out.println("✅ DataLoader 완료!");
        };
    }

    private void loadInitialExercises() {
        System.out.println("🔍 loadInitialExercises 시작");

        try {
            long exerciseCount = exerciseRepository.count();
            System.out.println("📊 현재 DB에 저장된 운동 데이터 개수: " + exerciseCount);
            System.out.println("🔧 강제 리셋 모드: " + forceReset);
            
            if (exerciseCount == 0 || forceReset) {
                if (forceReset) {
                    System.out.println("🔄 강제 리셋 모드: 기존 운동 데이터를 삭제하고 새로 로드합니다...");
                    exerciseRepository.deleteAll();
                } else {
                    System.out.println("🚀 운동 데이터가 없습니다. 제공된 운동 데이터로 초기화합니다...");
                }

                // CSV 매핑 및 제공된 운동 세트를 통해 초기화는 MetsDataLoader가 처리하므로 여기서는 아무 것도 하지 않음
                System.out.println("✅ 초기 운동 데이터는 MetsDataLoader에서 처리됩니다.");
            } else {
                System.out.println("✅ 운동 데이터가 이미 존재합니다. (" + exerciseCount + "개)");
                System.out.println("⏭️ 추가 초기화 없이 기존 데이터 사용");
            }
        } catch (Exception e) {
            System.out.println("❌ 데이터베이스 연결 또는 카운트 조회 중 오류: " + e.getMessage());
            e.printStackTrace();
        }
        
        System.out.println("🔍 loadInitialExercises 완료");
    }

    private void loadInitialTestData() {
        System.out.println("🔍 loadInitialTestData 시작");
        
        // 관리자 계정 생성
        createAdminUser();
        
        // 테스트 사용자가 있는지 확인
        Optional<User> existingUserOpt = userService.findByEmail("test@fitmate.com");
        
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            System.out.println("✅ 테스트 사용자가 이미 존재합니다. ID: " + existingUser.getId());
            // 비밀번호가 아직 암호화되지 않았다면 암호화
            if (existingUser.getPassword() != null && !existingUser.getPassword().startsWith("$2")) {
                existingUser.setPassword(passwordEncoder.encode("password123"));
                userService.save(existingUser);
                System.out.println("🔒 테스트 사용자 비밀번호를 BCrypt 로 암호화했습니다.");
            }
            
            // 📱 테스트 사용자 전화번호 보정
            String desiredPhone = "010-1234-5678";
            if (existingUser.getPhoneNumber() == null || !existingUser.getPhoneNumber().equals(desiredPhone)) {
                existingUser.setPhoneNumber(desiredPhone);
                userService.save(existingUser);
                System.out.println("📱 테스트 사용자 전화번호를 010-1234-5678 로 업데이트했습니다.");
            }
            
            // 기존 테스트 데이터가 있는지 확인
            long workoutCount = workoutRecordService.countByUserId(existingUser.getId());
            long bodyRecordCount = bodyRecordService.countByUserId(existingUser.getId());
            
            if ((workoutCount == 0 || bodyRecordCount == 0) || forceReset) {
                if (forceReset) {
                    System.out.println("🔄 강제 리셋 모드: 기존 테스트 데이터를 삭제하고 새로 생성합니다...");
                    workoutRecordService.deleteAllByUserId(existingUser.getId());
                    bodyRecordService.deleteAllByUserId(existingUser.getId());
                } else {
                    System.out.println("📊 테스트 데이터가 없습니다. 생성합니다...");
                }
                createWorkoutRecords(existingUser);
                createBodyRecords(existingUser);
                System.out.println("✅ 테스트 데이터 생성 완료!");
            } else {
                System.out.println("✅ 테스트 데이터가 이미 존재합니다. (운동 기록: " + workoutCount + "개, 신체 기록: " + bodyRecordCount + "개)");
            }

            // 항상 최근 5일 신체 데이터는 보정해서 채운다
            ensureRecentBodyRecords(existingUser);
            // 운동 기록은 생성 로직에서 일별 생성되므로 별도 보정 불필요
        } else {
            System.out.println("👤 테스트 사용자가 없습니다. 생성합니다...");
            User testUser = createTestUser();
            createWorkoutRecords(testUser);
            createBodyRecords(testUser);
            // 생성 직후에도 최근 5일은 반드시 채워준다
            ensureRecentBodyRecords(testUser);
            System.out.println("✅ 테스트 사용자 및 데이터 생성 완료! ID: " + testUser.getId());
        }
        
        System.out.println("🔍 loadInitialTestData 완료");
    }

    private User createTestUser() {
        // 새 테스트 사용자 생성
        User testUser = new User();
        testUser.setEmail("test@fitmate.com");
        testUser.setName("테스트 사용자");
        testUser.setPhoneNumber("010-1234-5678");
        testUser.setAge("28");
        testUser.setGender("male");
        testUser.setHeight("175.0");
        testUser.setWeight("70.0");
        testUser.setBirthDate("19960115"); // 생년월일 추가 (1996년 1월 15일)
        testUser.setGoal("체중 감량 및 근력 향상");
        testUser.setExperience("intermediate");
        
        // 비밀번호 설정 (제약조건: 8자 이상, 영문+숫자 포함)
        String password = "password123";
        testUser.setPassword(passwordEncoder.encode(password));
        
        testUser = userService.save(testUser);
        return testUser;
    }

    private void createWorkoutRecords(User user) {
        LocalDate startDate = LocalDate.now().minusDays(90); // 3개월치
        LocalDate endDate = LocalDate.now();

        List<Exercise> metExercises = exerciseRepository.findByMetsIsNotNull();
        if (metExercises.isEmpty()) {
            System.out.println("⚠️ MET 값이 있는 운동이 DB 에 없습니다. 기본 로직을 건너뜁니다.");
            return;
        }

        WorkoutRecord.WorkoutDifficulty[] difficulties = WorkoutRecord.WorkoutDifficulty.values();

        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            int dailyWorkouts = random.nextInt(3) + 1;

            for (int i = 0; i < dailyWorkouts; i++) {
                Exercise ex = metExercises.get(random.nextInt(metExercises.size()));

                WorkoutRecord record = new WorkoutRecord();
                record.setUser(user);
                record.setWorkoutDate(currentDate);
                record.setWorkoutType(ex.getName());

                record.setDuration(30 + random.nextInt(90)); // 30-120분

                double weight = 70.0;
                if (user.getWeight() != null) {
                    try {
                        weight = Double.parseDouble(user.getWeight());
                    } catch (NumberFormatException ignored) {}
                }

                double durationHours = record.getDuration() / 60.0;
                double mets = ex.getMets();
                int calculatedCalories = (int) Math.round(mets * weight * durationHours);
                record.setCalories(calculatedCalories);

                // MET 값에 따른 강도 설정
                int intensity;
                if (mets < 3.0) intensity = 1 + random.nextInt(3);
                else if (mets < 6.0) intensity = 4 + random.nextInt(3);
                else intensity = 7 + random.nextInt(4);
                record.setIntensity(intensity);
                
                // 난이도 설정 (강도에 따라)
                WorkoutRecord.WorkoutDifficulty difficulty;
                if (intensity <= 3) {
                    difficulty = WorkoutRecord.WorkoutDifficulty.EASY;
                } else if (intensity <= 6) {
                    difficulty = WorkoutRecord.WorkoutDifficulty.MODERATE;
                } else {
                    difficulty = WorkoutRecord.WorkoutDifficulty.HARD;
                }
                record.setDifficulty(difficulty);
                
                // 웨이트 운동인 경우 추가 정보 (무게는 1자리 반올림)
                if (ex.getName().contains("바벨") || ex.getName().contains("덤벨") ||
                    ex.getName().contains("레그") || ex.getName().contains("벤치")) {
                    record.setSets(3 + random.nextInt(5)); // 3-7세트
                    record.setReps(8 + random.nextInt(12)); // 8-19회
                    record.setWeight(roundTo1Decimal(20.0 + random.nextDouble() * 80.0)); // 20-100kg
                }
                
                record.setNotes("MET: " + roundTo1Decimal(mets) + ", 계산된 칼로리: " + calculatedCalories + " kcal");
                
                workoutRecordService.saveWorkoutRecord(user.getId(), record);
            }
            
            currentDate = currentDate.plusDays(1);
        }
    }

    private void createBodyRecords(User user) {
        LocalDate startDate = LocalDate.now().minusDays(90); // 3개월치 데이터
        LocalDate endDate = LocalDate.now();
        
        // 초기 신체 데이터
        double initialWeight = 72.0;
        double initialBodyFat = 18.0;
        double initialMuscleMass = 55.0;
        
        LocalDate currentDate = startDate;
        LocalDate mandatoryStart = endDate.minusDays(4); // 최근 5일은 무조건 생성
        while (!currentDate.isAfter(endDate)) {
            boolean mustCreate = !currentDate.isBefore(mandatoryStart);
            // 과거 구간은 주 2~3회, 최근 5일은 무조건 생성
            if (mustCreate || random.nextInt(7) < 3) {
                BodyRecord record = new BodyRecord();
                record.setUser(user);
                record.setMeasureDate(currentDate);
                
                // 점진적인 변화 생성 (체중 감소, 근육량 증가)
                double progressFactor = (currentDate.toEpochDay() - startDate.toEpochDay()) / 90.0; // 3개월 기준
                
                // 체중: 초기 72kg에서 점진적으로 감소 (소수점 첫째자리로 반올림)
                double weight = initialWeight - (progressFactor * 2.0) + (random.nextDouble() - 0.5) * 0.5;
                record.setWeight(roundTo1Decimal(weight));
                
                // 체지방률: 초기 18%에서 점진적으로 감소 (소수점 첫째자리로 반올림)
                double bodyFat = initialBodyFat - (progressFactor * 1.5) + (random.nextDouble() - 0.5) * 0.3;
                record.setBodyFatPercentage(roundTo1Decimal(bodyFat));
                
                // 근육량: 초기 55kg에서 점진적으로 증가 (소수점 첫째자리로 반올림)
                double muscleMass = initialMuscleMass + (progressFactor * 1.0) + (random.nextDouble() - 0.5) * 0.2;
                record.setMuscleMass(roundTo1Decimal(muscleMass));
                
                record.setNotes("테스트 신체 측정 기록");
                
                bodyRecordService.saveBodyRecord(user.getId(), record);
            }
            
            currentDate = currentDate.plusDays(1);
        }
    }

    /**
     * 최근 5일 신체 기록이 비어 있으면 채웁니다(중복 생성 방지).
     */
    private void ensureRecentBodyRecords(User user) {
        LocalDate endDate = LocalDate.now();
        LocalDate mandatoryStart = endDate.minusDays(4); // 최근 5일
        LocalDate startDateForProgress = endDate.minusDays(90);

        LocalDate date = mandatoryStart;
        while (!date.isAfter(endDate)) {
            boolean exists = bodyRecordService.getUserBodyRecordByDate(user.getId(), date).isPresent();
            if (!exists) {
                BodyRecord record = new BodyRecord();
                record.setUser(user);
                record.setMeasureDate(date);

                double daysFromStart = ChronoUnit.DAYS.between(startDateForProgress, date);
                double progressFactor = Math.max(0.0, Math.min(1.0, daysFromStart / 90.0));

                double baseWeight = 72.0;
                try {
                    if (user.getWeight() != null) {
                        baseWeight = Double.parseDouble(user.getWeight());
                    }
                } catch (NumberFormatException ignored) {}

                double weight = baseWeight - (progressFactor * 2.0) + (random.nextDouble() - 0.5) * 0.5;
                record.setWeight(roundTo1Decimal(weight));

                double baseBodyFat = 18.0;
                double bodyFat = baseBodyFat - (progressFactor * 1.5) + (random.nextDouble() - 0.5) * 0.3;
                record.setBodyFatPercentage(roundTo1Decimal(bodyFat));

                double baseMuscle = 55.0;
                double muscleMass = baseMuscle + (progressFactor * 1.0) + (random.nextDouble() - 0.5) * 0.2;
                record.setMuscleMass(roundTo1Decimal(muscleMass));

                record.setNotes("최근 5일 보정 자동 생성");
                bodyRecordService.saveBodyRecord(user.getId(), record);
                System.out.println("🧩 최근 5일 보정: " + date + " 데이터 생성 완료");
            }
            date = date.plusDays(1);
        }
    }

    private void createAdminUser() {
        System.out.println("👨‍💼 관리자 계정 확인 중...");
        
        // 관리자 계정이 있는지 확인
        Optional<User> existingAdminOpt = userService.findByEmail("admin@fitmate.com");
        
        if (existingAdminOpt.isPresent()) {
            User existingAdmin = existingAdminOpt.get();
            System.out.println("✅ 관리자 계정이 이미 존재합니다. ID: " + existingAdmin.getId());
            
            // 관리자 권한이 없으면 업데이트
            if (!"ROLE_ADMIN".equals(existingAdmin.getRole())) {
                System.out.println("🔄 관리자 권한 업데이트 중...");
                existingAdmin.setRole("ROLE_ADMIN");
                userService.save(existingAdmin);
                System.out.println("✅ 관리자 권한 업데이트 완료!");
            } else {
                System.out.println("✅ 관리자 권한이 이미 설정되어 있습니다.");
            }
        } else {
            System.out.println("👨‍💼 관리자 계정이 없습니다. 생성합니다...");
            User adminUser = new User();
            adminUser.setEmail("admin@fitmate.com");
            adminUser.setName("관리자");
            adminUser.setPhoneNumber("010-0000-0000");
            adminUser.setAge("30");
            adminUser.setGender("male");
            adminUser.setHeight("180.0");
            adminUser.setWeight("75.0");
            adminUser.setBirthDate("19940101");
            adminUser.setGoal("운동 관리 및 사용자 지원");
            adminUser.setExperience("advanced");
            adminUser.setRole("ROLE_ADMIN"); // 관리자 권한 설정
            
            // 비밀번호 설정 (테스트 사용자와 동일)
            String password = "password123";
            adminUser.setPassword(passwordEncoder.encode(password));
            
            adminUser = userService.save(adminUser);
            System.out.println("✅ 관리자 계정 생성 완료! ID: " + adminUser.getId());
            System.out.println("📧 이메일: admin@fitmate.com");
            System.out.println("🔑 비밀번호: password123");
        }
    }

    private double roundTo1Decimal(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
} 