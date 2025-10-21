package backend.fitmate.common.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 운동 세션 시작 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutSessionRequest {
    
    /**
     * 운동 목표
     */
    @NotBlank(message = "운동 목표는 필수입니다")
    @Size(max = 50, message = "운동 목표는 50자를 초과할 수 없습니다")
    private String goal;
    
    /**
     * 계획된 운동 시간 (분)
     */
    @Min(value = 1, message = "계획된 시간은 1분 이상이어야 합니다")
    private Integer plannedDuration;
}