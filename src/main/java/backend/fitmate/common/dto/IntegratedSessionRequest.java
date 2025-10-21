package backend.fitmate.common.dto;

import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * 통합 운동 세션 완료 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IntegratedSessionRequest {
    
    // 운동 프로그램 정보
    private String programId;
    private String programTitle;
    
    // 사용자 목표 (데이터베이스 필수 필드)
    private String goal;
    
    // 운동 결과 데이터
    private List<ExerciseResultData> exercises;
    
    // 전체 세션 통계
    private int totalDuration; // 초 단위
    private int totalSets;
    private int totalReps;
    private double caloriesBurned;
    private double averageFormScore; // 0.0 ~ 1.0
    
    // 피드백 데이터
    private FeedbackData feedback;
    
    // MotionCoach 데이터
    private MotionCoachData motionData;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExerciseResultData {
        private String exerciseType; // squat, pushup 등
        private String exerciseName; // 한글 이름
        private int targetSets;
        private int completedSets;
        private int targetReps;
        private int completedReps;
        private double averageFormScore; // 운동별 평균 정확도
        private int duration; // 초 단위
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedbackData {
        private Integer overallDifficulty; // 1-5
        private Integer satisfaction; // 1-5
        private String muscleSoreness; // 근육통 부위
        private Boolean wouldRepeat;
        private String comments;
        private Integer energyAfter; // 운동 후 에너지 레벨 1-5
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MotionCoachData {
        private double overallAccuracy; // 전체 정확도
        private double completionRate; // 완료율
        private String bestExercise; // 가장 잘한 운동
        private String needsImprovement; // 개선 필요 운동
        private List<String> formFeedback; // 자세 피드백 목록
    }
}