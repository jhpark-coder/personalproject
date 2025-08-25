package backend.fitmate.User.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 사용자 운동 선호도 - 학습을 통해 축적되는 개인별 운동 선호도
 */
@Entity
@Table(name = "user_exercise_preferences")
@IdClass(UserExercisePreferenceId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class UserExercisePreference {
    
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;
    
    @Id
    @Column(name = "exercise_name", length = 100)
    private String exerciseName;
    
    /**
     * 선호도 점수 (-1.0 ~ 1.0)
     * -1.0: 매우 싫어함, 0.0: 중립, 1.0: 매우 좋아함
     */
    @Column(precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal preferenceScore = BigDecimal.ZERO;
    
    /**
     * 효과 체감도 (0.0 ~ 1.0)
     * 이 운동이 사용자에게 얼마나 효과적인지에 대한 점수
     */
    @Column(precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal effectivenessScore = BigDecimal.valueOf(0.5);
    
    /**
     * 학습 데이터 수
     * 이 운동에 대한 피드백 데이터 개수
     */
    @Column
    @Builder.Default
    private Integer dataPoints = 0;
    
    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime lastUpdated;
    
    /**
     * 선호도 점수 업데이트
     * 새로운 피드백을 기반으로 이동 평균 방식으로 업데이트
     */
    public void updatePreferenceScore(Double newScore, Double weight) {
        if (newScore == null) return;
        
        double currentScore = this.preferenceScore.doubleValue();
        double learningRate = weight != null ? weight : 0.1;
        
        // 이동 평균: 새로운 값에 더 많은 가중치
        double updatedScore = currentScore * (1 - learningRate) + newScore * learningRate;
        updatedScore = Math.max(-1.0, Math.min(1.0, updatedScore));
        
        this.preferenceScore = BigDecimal.valueOf(updatedScore);
        this.dataPoints++;
    }
    
    /**
     * 효과 점수 업데이트
     */
    public void updateEffectivenessScore(Double newScore, Double weight) {
        if (newScore == null) return;
        
        double currentScore = this.effectivenessScore.doubleValue();
        double learningRate = weight != null ? weight : 0.1;
        
        double updatedScore = currentScore * (1 - learningRate) + newScore * learningRate;
        updatedScore = Math.max(0.0, Math.min(1.0, updatedScore));
        
        this.effectivenessScore = BigDecimal.valueOf(updatedScore);
    }
    
    /**
     * 선호도 라벨 반환
     */
    public String getPreferenceLabel() {
        double score = preferenceScore.doubleValue();
        
        if (score >= 0.6) return "매우 선호";
        else if (score >= 0.2) return "선호";
        else if (score >= -0.2) return "보통";
        else if (score >= -0.6) return "비선호";
        else return "매우 비선호";
    }
    
    /**
     * 신뢰도 점수 (데이터 포인트 기반)
     * 0.0 ~ 1.0, 더 많은 데이터가 있을수록 높은 신뢰도
     */
    public Double getConfidenceScore() {
        if (dataPoints == null || dataPoints == 0) return 0.0;
        
        // 5회 이상의 피드백이 있으면 신뢰도 0.8 이상
        return Math.min(dataPoints / 6.0, 1.0);
    }
}