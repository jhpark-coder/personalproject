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
import org.springframework.util.StringUtils;

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
import lombok.extern.slf4j.Slf4j;

@Configuration
@RequiredArgsConstructor
@Slf4j
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

    @Value("${data.loader.test-data.enabled:true}")
    private boolean testDataEnabled;

    @Value("${data.loader.force-reset:false}")
    private boolean forceReset;

    @Value("${data.loader.admin-password:}")
    private String adminPassword;

    @Value("${data.loader.test-password:}")
    private String testUserPassword;

    @Value("${data.loader.demo-email:demo@fitmate.local}")
    private String demoUserEmail;

    // Wger API 호출 비활성화 플래그 제거
    // @Value("${wger.fetch.enabled:true}")
    // private boolean wgerFetchEnabled;

    @Bean
    @ConditionalOnProperty(name = "data.loader.enabled", havingValue = "true", matchIfMissing = true)
    public CommandLineRunner loadData() {
        return args -> {
            log.info("DataLoader started: profiles={}, ddlAuto={}, initialDataOnly={}, testDataEnabled={}, forceReset={}",
                    System.getProperty("spring.profiles.active"),
                    System.getProperty("spring.jpa.hibernate.ddl-auto"),
                    initialDataOnly,
                    testDataEnabled,
                    forceReset);

            // 운동 데이터 로드 (데이터가 없을 때만, 또는 강제 리셋 시)
            loadInitialExercises();

            // MET 값 매핑 실행
            try {
                metsDataLoader.run();
            } catch (Exception e) {
                log.warn("MetsDataLoader failed", e);
            }

            if (testDataEnabled && !initialDataOnly) {
                loadInitialTestData();
            } else {
                log.info("Test data generation skipped");
            }

            log.info("DataLoader completed");
        };
    }

    private void loadInitialExercises() {
        log.debug("loadInitialExercises started");

        try {
            long exerciseCount = exerciseRepository.count();
            log.info("Exercise seed status: count={}, forceReset={}", exerciseCount, forceReset);

            if (exerciseCount == 0 || forceReset) {
                if (forceReset) {
                    log.warn("Force reset enabled: deleting existing exercise data before seed load");
                    exerciseRepository.deleteAll();
                } else {
                    log.info("No exercise data found; seed loader will initialize exercise data");
                }

                // CSV 매핑 및 제공된 운동 세트를 통해 초기화는 MetsDataLoader가 처리하므로 여기서는 아무 것도 하지 않음
                log.info("Initial exercise data is handled by MetsDataLoader");
            } else {
                log.info("Exercise data already exists; using existing rows: count={}", exerciseCount);
            }
        } catch (Exception e) {
            log.warn("Failed to inspect exercise seed state", e);
        }

        log.debug("loadInitialExercises completed");
    }

    private void loadInitialTestData() {
        log.debug("loadInitialTestData started");

        // 관리자 계정 생성
        createAdminUser();

        // 테스트 사용자가 있는지 확인
        Optional<User> existingUserOpt = userService.findByEmail(demoUserEmail);

        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            log.info("Test user already exists: id={}", existingUser.getId());
            // 비밀번호가 아직 암호화되지 않았다면 암호화
            if (existingUser.getPassword() != null && !existingUser.getPassword().startsWith("$2")) {
                if (StringUtils.hasText(testUserPassword)) {
                    existingUser.setPassword(passwordEncoder.encode(testUserPassword));
                    userService.save(existingUser);
                    log.info("Test user password was migrated to BCrypt");
                } else {
                    log.warn("Test user password migration skipped; configure data.loader.test-password");
                }
            }

            // 📱 테스트 사용자 전화번호 보정
            String desiredPhone = "010-1234-5678";
            if (existingUser.getPhoneNumber() == null || !existingUser.getPhoneNumber().equals(desiredPhone)) {
                existingUser.setPhoneNumber(desiredPhone);
                userService.save(existingUser);
                log.info("Test user phone number was normalized");
            }

            // 기존 테스트 데이터가 있는지 확인
            long workoutCount = workoutRecordService.countByUserId(existingUser.getId());
            long bodyRecordCount = bodyRecordService.countByUserId(existingUser.getId());

            if ((workoutCount == 0 || bodyRecordCount == 0) || forceReset) {
                if (forceReset) {
                    log.warn("Force reset enabled: deleting existing test data");
                    workoutRecordService.deleteAllByUserId(existingUser.getId());
                    bodyRecordService.deleteAllByUserId(existingUser.getId());
                } else {
                    log.info("Test data is missing; generating test data");
                }
                createWorkoutRecords(existingUser);
                createBodyRecords(existingUser);
                log.info("Test data generation completed");
            } else {
                log.info("Test data already exists: workoutCount={}, bodyRecordCount={}", workoutCount, bodyRecordCount);
            }

            // 항상 최근 5일 신체 데이터는 보정해서 채운다
            ensureRecentBodyRecords(existingUser);
            // 운동 기록은 생성 로직에서 일별 생성되므로 별도 보정 불필요
        } else {
            if (!StringUtils.hasText(testUserPassword)) {
                log.info("Test user creation skipped; configure data.loader.test-password to enable test seed users");
                return;
            }
            log.info("Test user does not exist; creating test user");
            User testUser = createTestUser();
            createWorkoutRecords(testUser);
            createBodyRecords(testUser);
            // 생성 직후에도 최근 5일은 반드시 채워준다
            ensureRecentBodyRecords(testUser);
            log.info("Test user and data generation completed: id={}", testUser.getId());
        }

        log.debug("loadInitialTestData completed");
    }

    private User createTestUser() {
        // 새 테스트 사용자 생성
        User testUser = new User();
        testUser.setEmail(demoUserEmail);
        testUser.setName("테스트 사용자");
        testUser.setPhoneNumber("010-1234-5678");
        testUser.setAge("28");
        testUser.setGender("male");
        testUser.setHeight("175.0");
        testUser.setWeight("70.0");
        testUser.setBirthDate("19960115"); // 생년월일 추가 (1996년 1월 15일)
        testUser.setGoal("체중 감량 및 근력 향상");
        testUser.setExperience("intermediate");

        testUser.setPassword(passwordEncoder.encode(testUserPassword));

        testUser = userService.save(testUser);
        return testUser;
    }

    private void createWorkoutRecords(User user) {
        LocalDate startDate = LocalDate.now().minusDays(90); // 3개월치
        LocalDate endDate = LocalDate.now();

        List<Exercise> metExercises = exerciseRepository.findByMetsIsNotNull();
        if (metExercises.isEmpty()) {
            log.warn("No exercises with MET values found; skipping workout record generation");
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
                log.debug("Recent body record backfilled: date={}", date);
            }
            date = date.plusDays(1);
        }
    }

    private void createAdminUser() {
        log.info("Checking bootstrap admin account");

        // 관리자 계정이 있는지 확인
        Optional<User> existingAdminOpt = userService.findByEmail("admin@fitmate.com");

        if (existingAdminOpt.isPresent()) {
            User existingAdmin = existingAdminOpt.get();
            log.info("Bootstrap admin account already exists: id={}", existingAdmin.getId());

            // 관리자 권한이 없으면 업데이트
            if (!"ROLE_ADMIN".equals(existingAdmin.getRole())) {
                log.warn("Existing bootstrap admin missing ROLE_ADMIN; updating role");
                existingAdmin.setRole("ROLE_ADMIN");
                userService.save(existingAdmin);
                log.info("Bootstrap admin role updated");
            } else {
                log.debug("Bootstrap admin role already configured");
            }
        } else {
            log.info("Bootstrap admin account does not exist");
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
            adminUser.setRole("ROLE_ADMIN");

            String password = adminPassword;
            if (password == null || password.isBlank()) {
                log.info("Bootstrap admin creation skipped; configure data.loader.admin-password to enable it");
                return;
            }
            adminUser.setPassword(passwordEncoder.encode(password));

            adminUser = userService.save(adminUser);
            log.info("Bootstrap admin account created: id={}", adminUser.getId());
        }
    }

    private double roundTo1Decimal(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
