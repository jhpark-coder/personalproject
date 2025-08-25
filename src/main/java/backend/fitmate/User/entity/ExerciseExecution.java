package backend.fitmate.User.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 개별 운동 실행 기록 - 세션 내에서 수행된 각각의 운동에 대한 상세 기록
 */
@Entity
@Table(name = "exercise_executions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExerciseExecution {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private WorkoutSession session;
    
    @Column(nullable = false, length = 100)
    private String exerciseName;
    
    @Column
    private Integer plannedSets;
    
    @Column
    private Integer completedSets;
    
    @Column
    private Integer plannedReps;
    
    @Column
    private Integer completedReps;
    
    @Column
    private Integer plannedDuration; // 초
    
    @Column
    private Integer actualDuration; // 초
    
    /**
     * RPE (Rate of Perceived Exertion) 스케일 1~10
     * 1: 매우 가벼움, 10: 최대 강도
     */
    @Column
    private Integer perceivedExertion;
    
    /**
     * 완료율 계산
     * @return 0.0 ~ 1.0 사이의 값
     */
    public Double getCompletionRate() {
        if (plannedSets == null || plannedReps == null || 
            completedSets == null || completedReps == null ||
            plannedSets == 0 || plannedReps == 0) {
            return 0.0;
        }
        
        double plannedTotal = plannedSets * plannedReps;
        double completedTotal = completedSets * completedReps;
        
        return Math.min(completedTotal / plannedTotal, 1.0);
    }
    
    /**
     * 운동 강도 평가
     * @return LOW, MODERATE, HIGH
     */
    public String getIntensityLevel() {
        if (perceivedExertion == null) return "UNKNOWN";
        
        if (perceivedExertion <= 3) return "LOW";
        else if (perceivedExertion <= 6) return "MODERATE";
        else return "HIGH";
    }
}