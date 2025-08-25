package backend.fitmate.User.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 세션 전체 피드백 - 운동 세션 완료 후 사용자의 전체적인 평가
 */
@Entity
@Table(name = "session_feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class SessionFeedback {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private WorkoutSession session;
    
    /**
     * 완료율 (0.0 ~ 1.0)
     * 전체 계획 대비 실제 완료한 비율
     */
    @Column(precision = 3, scale = 2)
    private BigDecimal completionRate;
    
    /**
     * 전체적인 난이도 (1 ~ 5)
     * 1: 너무 쉬움, 2: 쉬움, 3: 적당함, 4: 어려움, 5: 너무 어려움
     */
    @Column
    private Integer overallDifficulty;
    
    /**
     * 만족도 (1 ~ 5)
     * 1: 별로, 2: 그저그럼, 3: 보통, 4: 만족, 5: 매우 만족
     */
    @Column
    private Integer satisfaction;
    
    /**
     * 운동 후 에너지 상태 (1 ~ 5)
     * 1: 완전 지침, 2: 피곤함, 3: 보통, 4: 활기참, 5: 에너지 충만
     */
    @Column
    private Integer energyAfter;
    
    /**
     * 근육통 정도 (1 ~ 5)
     * 1: 전혀 없음, 2: 약간, 3: 보통, 4: 꽤 아픔, 5: 심한 통증
     */
    @Column
    private Integer muscleSoreness;
    
    /**
     * 재선택 의향
     * 같은 운동을 다시 하고 싶은지 여부
     */
    @Column(nullable = false)
    private Boolean wouldRepeat;
    
    /**
     * 자유 의견
     */
    @Column(columnDefinition = "TEXT")
    private String comments;
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    /**
     * 난이도 평가를 문자열로 반환
     */
    public String getDifficultyLabel() {
        if (overallDifficulty == null) return "평가없음";
        
        return switch (overallDifficulty) {
            case 1 -> "너무 쉬움";
            case 2 -> "쉬움";
            case 3 -> "적당함";
            case 4 -> "어려움";
            case 5 -> "너무 어려움";
            default -> "평가없음";
        };
    }
    
    /**
     * 만족도 평가를 문자열로 반환
     */
    public String getSatisfactionLabel() {
        if (satisfaction == null) return "평가없음";
        
        return switch (satisfaction) {
            case 1 -> "별로";
            case 2 -> "그저그럼";
            case 3 -> "보통";
            case 4 -> "만족";
            case 5 -> "매우 만족";
            default -> "평가없음";
        };
    }
    
    /**
     * 전체적인 세션 성공도 점수 계산 (0.0 ~ 1.0)
     * 완료율, 적정 난이도, 만족도를 종합하여 계산
     */
    public Double getSuccessScore() {
        if (completionRate == null || overallDifficulty == null || satisfaction == null) {
            return 0.0;
        }
        
        // 완료율 가중치: 40%
        double completionScore = completionRate.doubleValue() * 0.4;
        
        // 적정 난이도 점수 (3이 최적): 30%
        double difficultyScore = (1.0 - Math.abs(overallDifficulty - 3.0) / 2.0) * 0.3;
        difficultyScore = Math.max(0.0, difficultyScore);
        
        // 만족도 점수: 30%
        double satisfactionScore = (satisfaction - 1.0) / 4.0 * 0.3;
        
        return Math.min(completionScore + difficultyScore + satisfactionScore, 1.0);
    }
}