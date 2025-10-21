package backend.fitmate.domain.workout.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FullSessionFeedbackDto {
    private Long sessionId;
    private BigDecimal completionRate; // 0.0 ~ 1.0
    private Integer overallDifficulty; // 1 ~ 5
    private Integer satisfaction; // 1 ~ 5
    private Integer energyAfter; // 1 ~ 5
    private Integer muscleSoreness; // 1 ~ 5
    private Boolean wouldRepeat; // true/false
    private String comments; // 자유 의견
} 