package backend.fitmate.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 사용자 피트니스 프로필 - 적응형 추천을 위한 사용자 현재 상태
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserFitnessProfile {
    
    private Long userId;
    private String goal;
    
    /**
     * 현재 피트니스 레벨 (0.0 ~ 1.0)
     * 0.0: 매우 낮음, 1.0: 매우 높음
     */
    @Builder.Default
    private Double currentFitnessLevel = 0.5;
    
    /**
     * 평균 완료율 (0.0 ~ 1.0)
     * 최근 세션들의 평균 완료율
     */
    @Builder.Default
    private Double averageCompletionRate = 0.8;
    
    /**
     * 선호하는 난이도 (1.0 ~ 5.0)
     * 사용자가 가장 만족하는 난이도 수준
     */
    @Builder.Default
    private Double preferredDifficulty = 3.0;
    
    /**
     * 진행 추세 (-1.0 ~ 1.0)
     * -1.0: 급격한 하락, 0.0: 정체, 1.0: 급격한 상승
     */
    @Builder.Default
    private Double progressTrend = 0.0;
    
    /**
     * 회복 패턴 (1.0 ~ 5.0)
     * 높을수록 빠른 회복, 낮을수록 더 많은 휴식 필요
     */
    @Builder.Default
    private Double recoveryPattern = 3.0;
    
    /**
     * 동기 수준 (0.0 ~ 1.0)
     * 최근 세션 참여도와 만족도 기반
     */
    @Builder.Default
    private Double motivationLevel = 0.7;
    
    /**
     * 경험 수준
     */
    private String experienceLevel;
    
    /**
     * 마지막 업데이트 시간
     */
    private LocalDateTime lastUpdated;
    
    /**
     * 신뢰도 점수 (0.0 ~ 1.0)
     * 프로필 계산에 사용된 데이터의 신뢰도
     */
    @Builder.Default
    private Double confidenceScore = 0.5;
    
    /**
     * 피트니스 레벨 라벨 반환
     */
    public String getFitnessLevelLabel() {
        if (currentFitnessLevel >= 0.8) return "매우 높음";
        else if (currentFitnessLevel >= 0.6) return "높음";
        else if (currentFitnessLevel >= 0.4) return "보통";
        else if (currentFitnessLevel >= 0.2) return "낮음";
        else return "매우 낮음";
    }
    
    /**
     * 진행 추세 라벨 반환
     */
    public String getProgressTrendLabel() {
        if (progressTrend >= 0.3) return "빠른 향상";
        else if (progressTrend >= 0.1) return "점진적 향상";
        else if (progressTrend >= -0.1) return "유지";
        else if (progressTrend >= -0.3) return "약간 하락";
        else return "개선 필요";
    }
    
    /**
     * 동기 수준 라벨 반환
     */
    public String getMotivationLevelLabel() {
        if (motivationLevel >= 0.8) return "매우 높음";
        else if (motivationLevel >= 0.6) return "높음";
        else if (motivationLevel >= 0.4) return "보통";
        else if (motivationLevel >= 0.2) return "낮음";
        else return "매우 낮음";
    }
    
    /**
     * 적응 팩터 계산
     * 현재 상태를 고려하여 운동 강도 조절 값 반환
     * @return -0.3 ~ 0.3 (음수: 강도 감소, 양수: 강도 증가)
     */
    public Double getAdaptationFactor() {
        double factor = 0.0;
        
        // 완료율이 높으면 강도 증가
        if (averageCompletionRate > 0.9) factor += 0.15;
        else if (averageCompletionRate < 0.7) factor -= 0.15;
        
        // 선호 난이도가 낮으면 (쉽다고 느끼면) 강도 증가
        if (preferredDifficulty < 2.5) factor += 0.1;
        else if (preferredDifficulty > 4.0) factor -= 0.1;
        
        // 진행 추세가 정체이거나 하락이면 변화 필요
        if (progressTrend < -0.1) factor += 0.05; // 새로운 자극 필요
        
        return Math.max(-0.3, Math.min(0.3, factor));
    }
    
    /**
     * 프로필의 유효성 검사
     */
    public boolean isValid() {
        return userId != null && 
               goal != null && 
               confidenceScore >= 0.3; // 최소 신뢰도 필요
    }
}