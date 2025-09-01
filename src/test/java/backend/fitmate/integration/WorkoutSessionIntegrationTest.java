package backend.fitmate.integration;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import backend.fitmate.User.entity.ExerciseExecution;
import backend.fitmate.User.entity.SessionFeedback;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.WorkoutSession;
import backend.fitmate.User.repository.UserRepository;
import backend.fitmate.User.repository.WorkoutSessionRepository;

/**
 * 통합 운동 시스템 워크플로우 백엔드 통합 테스트
 * 
 * 테스트 범위:
 * 1. 온보딩 데이터 저장 및 통합
 * 2. MotionCoach 세션 피드백 수신 및 처리
 * 3. 적응형 추천 시스템과의 데이터 연동
 * 4. 데이터 일관성 및 무결성 검증
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class WorkoutSessionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        // 테스트 사용자 생성
        testUser = new User();
        testUser.setOauthProvider("google");
        testUser.setOauthId("test123");
        testUser.setName("테스트 사용자");
        testUser.setEmail("test@example.com");
        testUser.setGoal("fitness");
        testUser.setExperience("intermediate");
        testUser.setHeight("175");
        testUser.setWeight("70");
        testUser.setAge("30");
        testUser.setGender("male");
        testUser = userRepository.save(testUser);
    }

    //@Test
    @DisplayName("온보딩 프로필 저장 통합 테스트")
    @WithMockUser(username = "google:test123")
    void testSaveOnboardingProfile() throws Exception {
        // Given: 온보딩 데이터
        Map<String, Object> onboardingData = Map.of(
                "goal", "fitness",
                "experience", "intermediate",
                "height", "175",
                "weight", "70",
                "age", "30",
                "gender", "male",
                "phoneNumber", "010-1234-5678"
        );

        // When & Then: 온보딩 프로필 저장 API 호출 및 응답 검증
        mockMvc.perform(post("/api/auth/save-onboarding-profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(onboardingData)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("온보딩 프로필이 완전히 저장되었습니다."));

        // 사용자 데이터가 올바르게 업데이트되었는지 확인
        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals("fitness", updatedUser.getGoal());
        assertEquals("intermediate", updatedUser.getExperience());
        assertEquals("175", updatedUser.getHeight());
        assertEquals("70", updatedUser.getWeight());
        assertEquals("010-1234-5678", updatedUser.getPhoneNumber());
    }

    //    //@Test
    @DisplayName("MotionCoach 세션 피드백 수신 및 저장 통합 테스트")
    @WithMockUser(username = "google:test123")
    void testReceiveMotionCoachSessionFeedback() throws Exception {
        // Given: MotionCoach 세션 데이터
        LocalDateTime startTime = LocalDateTime.now().minusMinutes(10);
        LocalDateTime endTime = LocalDateTime.now();
        
        Map<String, Object> sessionData = Map.of(
                "exerciseType", "squat",
                "startTime", startTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                "endTime", endTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                "totalReps", 25,
                "averageFormScore", 0.85,
                "formCorrections", List.of("무릎 각도 조정", "등 자세 교정"),
                "duration", 180,
                "caloriesBurned", 45,
                "performanceHistory", List.of(
                        Map.of(
                                "timestamp", LocalDateTime.now().minusMinutes(8).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                                "repCount", 5,
                                "formScore", 0.8,
                                "confidence", 0.9,
                                "feedback", "좋아요, 아래 구간"
                        )
                )
        );

        // When & Then: 세션 피드백 API 호출 및 응답 검증
        mockMvc.perform(post("/api/workout/full-session-feedback")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sessionData)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("운동 세션 데이터가 성공적으로 저장되었습니다."))
                .andExpect(jsonPath("$.sessionId").exists());

        // DB 검증
        List<WorkoutSession> sessions = workoutSessionRepository.findAll();
        assertFalse(sessions.isEmpty());

        WorkoutSession savedSession = sessions.get(0);
        assertEquals(testUser.getId(), savedSession.getUser().getId());
        assertEquals("fitness", savedSession.getGoal());
        assertEquals(3, savedSession.getActualDuration()); // 180초 = 3분

        // ExerciseExecution 확인
        assertEquals(1, savedSession.getExerciseExecutions().size());
        ExerciseExecution execution = savedSession.getExerciseExecutions().get(0);
        assertEquals("squat", execution.getExerciseName());
        assertEquals(25, execution.getCompletedReps());
        assertEquals(180, execution.getActualDuration());

        // SessionFeedback 확인
        SessionFeedback feedback = savedSession.getFeedback();
        assertNotNull(feedback);
        assertEquals(0.85, feedback.getCompletionRate().doubleValue(), 0.01);
        assertEquals(3, feedback.getOverallDifficulty()); // 기본값
        assertTrue(feedback.getWouldRepeat());
        assertTrue(feedback.getComments().contains("자세 교정 포인트"));
    }

    @Test
    @DisplayName("적응형 추천 시스템 통합 테스트")
    @WithMockUser(username = "google:test123")
    void testAdaptiveRecommendationIntegration() throws Exception {
        // Given: 이전 운동 세션 데이터 생성 (MotionCoach를 통한 운동)
        WorkoutSession previousSession = createMotionCoachSession(testUser, "squat", 0.9, 4);
        workoutSessionRepository.save(previousSession);

        // Given: 추천 요청 데이터
        Map<String, Object> requestData = Map.of(
                "goal", "fitness",
                "targetDuration", 45
        );

        // When: 적응형 추천 API 호출
        MvcResult result = mockMvc.perform(post("/api/adaptive-workout/recommend")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestData)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        // Then: 추천 결과에 MotionCoach 데이터가 반영되었는지 확인
        String responseContent = result.getResponse().getContentAsString();
        assertTrue(responseContent.contains("adaptationInfo"));
    }

    //@Test
    @DisplayName("데이터 일관성 검증 - 온보딩부터 추천까지 완전한 워크플로우")
    @WithMockUser(username = "google:test123")
    void testCompleteWorkflowDataConsistency() throws Exception {
        // Step 1: 온보딩 프로필 저장
        Map<String, Object> onboardingData = Map.of(
                "goal", "strength",
                "experience", "beginner",
                "height", "170",
                "weight", "65",
                "age", "25",
                "gender", "female"
        );

        mockMvc.perform(post("/api/auth/save-onboarding-profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(onboardingData)))
                .andExpect(status().isOk());

        // Step 2: 여러 MotionCoach 세션 실행
        for (int i = 0; i < 3; i++) {
            Map<String, Object> sessionData = createSessionData("pushup", 15 + i * 5, 0.7 + i * 0.1);
            mockMvc.perform(post("/api/workout/full-session-feedback")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(sessionData)))
                    .andExpect(status().isOk());
        }

        // Step 3: 적응형 추천 요청
        Map<String, Object> recommendationRequest = Map.of(
                "goal", "strength",
                "targetDuration", 30
        );

        MvcResult recommendationResult = mockMvc.perform(post("/api/adaptive-workout/recommend")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(recommendationRequest)))
                .andExpect(status().isOk())
                .andReturn();

        // Then: 데이터 일관성 확인
        // 1. 사용자 프로필이 추천에 반영되었는지
        String response = recommendationResult.getResponse().getContentAsString();
        assertTrue(response.contains("strength")); // 목표가 반영됨
        assertTrue(response.contains("beginner")); // 경험 수준이 반영됨

        // 2. 세션 데이터가 올바르게 저장되었는지
        List<WorkoutSession> sessions = workoutSessionRepository.findAll();
        assertEquals(3, sessions.size());

        // 3. 각 세션의 데이터 무결성 확인
        for (WorkoutSession session : sessions) {
            assertNotNull(session.getFeedback());
            assertFalse(session.getExerciseExecutions().isEmpty());
            assertEquals("strength", session.getGoal()); // 사용자 목표와 일치
        }
    }

    //@Test
    @DisplayName("성능 테스트 - 대용량 세션 데이터 처리")
    @WithMockUser(username = "google:test123")
    void testPerformanceWithLargeSessionData() throws Exception {
        // Given: 대량의 성능 기록 데이터
        List<Map<String, Object>> largePerformanceHistory = createLargePerformanceHistory(100);
        
        Map<String, Object> sessionData = Map.of(
                "exerciseType", "squat",
                "startTime", LocalDateTime.now().minusMinutes(30).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                "endTime", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                "totalReps", 100,
                "averageFormScore", 0.85,
                "formCorrections", List.of("다양한 교정 사항들"),
                "duration", 1800, // 30분
                "caloriesBurned", 150,
                "performanceHistory", largePerformanceHistory
        );

        // When: 대용량 데이터로 API 호출
        long startTime = System.currentTimeMillis();
        
        mockMvc.perform(post("/api/workout/full-session-feedback")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(sessionData)))
                .andExpect(status().isOk());
        
        long endTime = System.currentTimeMillis();
        long processingTime = endTime - startTime;

        // Then: 성능 기준 검증 (5초 이내)
        assertTrue(processingTime < 5000, "대용량 데이터 처리가 5초를 초과했습니다: " + processingTime + "ms");

        // 데이터 정확성 확인
        List<WorkoutSession> sessions = workoutSessionRepository.findAll();
        assertEquals(1, sessions.size());
        assertEquals(100, sessions.get(0).getExerciseExecutions().get(0).getCompletedReps());
    }

    @Test
    @DisplayName("에러 처리 테스트 - 잘못된 세션 데이터")
    @WithMockUser(username = "google:test123")
    void testInvalidSessionDataHandling() throws Exception {
        // Given: 필수 필드가 누락된 세션 데이터
        Map<String, Object> invalidSessionData = Map.of(
                "exerciseType", "squat"
                // startTime, totalReps, duration 누락
        );

        // When & Then: 400 에러 응답 확인
        mockMvc.perform(post("/api/workout/full-session-feedback")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidSessionData)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("필수 데이터가 누락되었습니다."));
    }

    // Helper Methods

    private WorkoutSession createMotionCoachSession(User user, String exerciseType, double formScore, int difficulty) {
        WorkoutSession session = new WorkoutSession();
        session.setUser(user);
        session.setGoal("fitness");
        session.setActualDuration(3);
        return session;
    }

    private Map<String, Object> createSessionData(String exerciseType, int reps, double formScore) {
        return Map.of(
                "exerciseType", exerciseType,
                "startTime", LocalDateTime.now().minusMinutes(10).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                "endTime", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                "totalReps", reps,
                "averageFormScore", formScore,
                "formCorrections", List.of("기본 교정"),
                "duration", 300,
                "caloriesBurned", 50
        );
    }

    private List<Map<String, Object>> createLargePerformanceHistory(int count) {
        return java.util.stream.IntStream.range(0, count)
                .mapToObj(i -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("timestamp", LocalDateTime.now().minusMinutes(30 - i).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                    map.put("repCount", i + 1);
                    map.put("formScore", 0.8 + (i % 20) * 0.01);
                    map.put("confidence", 0.9);
                    map.put("feedback", "운동 진행 중");
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());
    }
}