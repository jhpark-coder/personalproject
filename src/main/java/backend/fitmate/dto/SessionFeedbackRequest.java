package backend.fitmate.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 세션 피드백 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionFeedbackRequest {
    
    /**
     * 완료율 (0.0 ~ 1.0)
     */
    @NotNull(message = "완료율은 필수입니다")
    @DecimalMin(value = "0.0", message = "완료율은 0.0 이상이어야 합니다")
    @DecimalMax(value = "1.0", message = "완료율은 1.0 이하여야 합니다")
    private BigDecimal completionRate;
    
    /**
     * 전체적인 난이도 (1 ~ 5)
     */
    @NotNull(message = "난이도 평가는 필수입니다")
    @Min(value = 1, message = "난이도는 1 이상이어야 합니다")
    @Max(value = 5, message = "난이도는 5 이하여야 합니다")
    private Integer overallDifficulty;
    
    /**
     * 만족도 (1 ~ 5)
     */
    @NotNull(message = "만족도 평가는 필수입니다")
    @Min(value = 1, message = "만족도는 1 이상이어야 합니다")
    @Max(value = 5, message = "만족도는 5 이하여야 합니다")
    private Integer satisfaction;
    
    /**
     * 운동 후 에너지 상태 (1 ~ 5)
     */
    @Min(value = 1, message = "에너지 상태는 1 이상이어야 합니다")
    @Max(value = 5, message = "에너지 상태는 5 이하여야 합니다")
    private Integer energyAfter;
    
    /**
     * 근육통 정도 (1 ~ 5)
     */
    @Min(value = 1, message = "근육통 정도는 1 이상이어야 합니다")
    @Max(value = 5, message = "근육통 정도는 5 이하여야 합니다")
    private Integer muscleSoreness;
    
    /**
     * 재선택 의향
     */
    @NotNull(message = "재선택 의향은 필수입니다")
    private Boolean wouldRepeat;
    
    /**
     * 자유 의견
     */
    @Size(max = 1000, message = "의견은 1000자를 초과할 수 없습니다")
    private String comments;
    
    /**
     * 개별 운동 피드백 목록
     */
    @Valid
    private List<ExerciseFeedbackRequest> exerciseFeedbacks;
    
    /**
     * 개별 운동 피드백 요청 DTO
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExerciseFeedbackRequest {
        
        @NotNull(message = "운동 이름은 필수입니다")
        @Size(min = 1, max = 100, message = "운동 이름은 1-100자 사이여야 합니다")
        private String exerciseName;
        
        private Integer plannedSets;
        private Integer completedSets;
        private Integer plannedReps;
        private Integer completedReps;
        private Integer plannedDuration;
        private Integer actualDuration;
        
        /**
         * RPE (Rate of Perceived Exertion) 스케일 1~10
         */
        @Min(value = 1, message = "운동 강도는 1 이상이어야 합니다")
        @Max(value = 10, message = "운동 강도는 10 이하여야 합니다")
        private Integer perceivedExertion;
    }
}