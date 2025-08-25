package backend.fitmate.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.OptionalDouble;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import backend.fitmate.User.entity.SessionFeedback;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.repository.SessionFeedbackRepository;
import backend.fitmate.dto.UserFitnessProfile;
import lombok.extern.slf4j.Slf4j;

/**
 * 사용자 피트니스 프로필 분석 서비스
 * 최근 운동 데이터를 분석하여 사용자의 현재 피트니스 상태를 계산
 */
@Service
@Slf4j
public class UserFitnessProfileService {
    
    @Autowired
    private SessionFeedbackRepository feedbackRepository;
    
    private static final int ANALYSIS_PERIOD_DAYS = 28; // 4주간 데이터 분석
    private static final int MIN_DATA_POINTS = 3; // 최소 데이터 포인트
    
    /**
     * 사용자의 현재 피트니스 프로필 계산
     */
    public UserFitnessProfile calculateProfile(User user) {
        log.info("사용자 피트니스 프로필 계산 시작: userId={}", user.getId());
        
        // 최근 4주간 피드백 데이터 조회
        LocalDateTime fromDate = LocalDateTime.now().minusDays(ANALYSIS_PERIOD_DAYS);
        List<SessionFeedback> recentFeedback = feedbackRepository.findRecentFeedback(user, fromDate);
        
        if (recentFeedback.isEmpty()) {
            log.warn("사용자 피드백 데이터가 없음: userId={}", user.getId());
            return createDefaultProfile(user);
        }
        
        // 각 지표 계산
        Double currentFitnessLevel = calculateFitnessLevel(recentFeedback);
        Double averageCompletionRate = calculateAverageCompletionRate(recentFeedback);
        Double preferredDifficulty = calculatePreferredDifficulty(recentFeedback);
        Double progressTrend = calculateProgressTrend(recentFeedback);
        Double recoveryPattern = calculateRecoveryPattern(recentFeedback);
        Double motivationLevel = calculateMotivationLevel(recentFeedback);
        Double confidenceScore = calculateConfidenceScore(recentFeedback);
        
        UserFitnessProfile profile = UserFitnessProfile.builder()
                .userId(user.getId())
                .goal(user.getGoal())
                .currentFitnessLevel(currentFitnessLevel)
                .averageCompletionRate(averageCompletionRate)
                .preferredDifficulty(preferredDifficulty)
                .progressTrend(progressTrend)
                .recoveryPattern(recoveryPattern)
                .motivationLevel(motivationLevel)
                .experienceLevel(user.getExperience())
                .lastUpdated(LocalDateTime.now())
                .confidenceScore(confidenceScore)
                .build();
        
        log.info("피트니스 프로필 계산 완료: userId={}, 신뢰도={}, 피트니스레벨={}", 
                user.getId(), confidenceScore, currentFitnessLevel);
        
        return profile;
    }
    
    /**
     * 기본 프로필 생성 (데이터가 없는 새 사용자용)
     */
    private UserFitnessProfile createDefaultProfile(User user) {
        return UserFitnessProfile.builder()
                .userId(user.getId())
                .goal(user.getGoal())
                .currentFitnessLevel(getDefaultFitnessLevel(user.getExperience()))
                .averageCompletionRate(0.8)
                .preferredDifficulty(3.0)
                .progressTrend(0.0)
                .recoveryPattern(3.0)
                .motivationLevel(0.7)
                .experienceLevel(user.getExperience())
                .lastUpdated(LocalDateTime.now())
                .confidenceScore(0.3) // 낮은 신뢰도
                .build();
    }
    
    /**
     * 경험 수준별 기본 피트니스 레벨
     */
    private Double getDefaultFitnessLevel(String experience) {
        return switch (experience != null ? experience : "beginner") {
            case "advanced" -> 0.7;
            case "intermediate" -> 0.5;
            default -> 0.3;
        };
    }
    
    /**
     * 현재 피트니스 레벨 계산
     * 완료율, 만족도, 난이도 적합성을 종합하여 계산
     */
    private Double calculateFitnessLevel(List<SessionFeedback> feedbacks) {
        if (feedbacks.isEmpty()) return 0.5;
        
        OptionalDouble avgCompletionRate = feedbacks.stream()
                .filter(f -> f.getCompletionRate() != null)
                .mapToDouble(f -> f.getCompletionRate().doubleValue())
                .average();
        
        OptionalDouble avgSatisfaction = feedbacks.stream()
                .filter(f -> f.getSatisfaction() != null)
                .mapToDouble(SessionFeedback::getSatisfaction)
                .average();
        
        OptionalDouble avgDifficulty = feedbacks.stream()
                .filter(f -> f.getOverallDifficulty() != null)
                .mapToDouble(SessionFeedback::getOverallDifficulty)
                .average();
        
        if (avgCompletionRate.isEmpty()) return 0.5;
        
        double fitnessScore = 0.0;
        
        // 완료율 기반 점수 (40%)
        fitnessScore += avgCompletionRate.getAsDouble() * 0.4;
        
        // 만족도 기반 점수 (30%)
        if (avgSatisfaction.isPresent()) {
            fitnessScore += ((avgSatisfaction.getAsDouble() - 1) / 4.0) * 0.3;
        }
        
        // 난이도 적합성 점수 (30%)
        if (avgDifficulty.isPresent()) {
            double difficultyFit = 1.0 - Math.abs(avgDifficulty.getAsDouble() - 3.0) / 2.0;
            fitnessScore += difficultyFit * 0.3;
        }
        
        return Math.max(0.0, Math.min(1.0, fitnessScore));
    }
    
    /**
     * 평균 완료율 계산
     */
    private Double calculateAverageCompletionRate(List<SessionFeedback> feedbacks) {
        return feedbacks.stream()
                .filter(f -> f.getCompletionRate() != null)
                .mapToDouble(f -> f.getCompletionRate().doubleValue())
                .average()
                .orElse(0.8);
    }
    
    /**
     * 선호 난이도 계산
     * 높은 만족도를 보인 세션들의 평균 난이도
     */
    private Double calculatePreferredDifficulty(List<SessionFeedback> feedbacks) {
        OptionalDouble preferredDiff = feedbacks.stream()
                .filter(f -> f.getSatisfaction() != null && f.getSatisfaction() >= 4)
                .filter(f -> f.getOverallDifficulty() != null)
                .mapToDouble(SessionFeedback::getOverallDifficulty)
                .average();
        
        return preferredDiff.orElse(3.0);
    }
    
    /**
     * 진행 추세 계산
     * 시간에 따른 성과 변화 추이를 선형 회귀로 분석
     */
    private Double calculateProgressTrend(List<SessionFeedback> feedbacks) {
        if (feedbacks.size() < 3) return 0.0;
        
        // 시간순으로 정렬된 성공 점수 데이터
        List<Double> successScores = feedbacks.stream()
                .filter(f -> f.getSuccessScore() != null)
                .map(SessionFeedback::getSuccessScore)
                .toList();
        
        if (successScores.size() < 3) return 0.0;
        
        // 간단한 선형 회귀: 최근 점수 - 초기 점수
        double initialScore = successScores.subList(successScores.size() - 3, successScores.size()).stream()
                .mapToDouble(Double::doubleValue).average().orElse(0.0);
        double recentScore = successScores.subList(0, 3).stream()
                .mapToDouble(Double::doubleValue).average().orElse(0.0);
        
        double trend = recentScore - initialScore;
        return Math.max(-1.0, Math.min(1.0, trend));
    }
    
    /**
     * 회복 패턴 계산
     * 근육통과 에너지 수준을 기반으로 회복 능력 평가
     */
    private Double calculateRecoveryPattern(List<SessionFeedback> feedbacks) {
        OptionalDouble avgEnergyAfter = feedbacks.stream()
                .filter(f -> f.getEnergyAfter() != null)
                .mapToDouble(SessionFeedback::getEnergyAfter)
                .average();
        
        OptionalDouble avgMuscleSoreness = feedbacks.stream()
                .filter(f -> f.getMuscleSoreness() != null)
                .mapToDouble(SessionFeedback::getMuscleSoreness)
                .average();
        
        double recoveryScore = 3.0;
        
        if (avgEnergyAfter.isPresent()) {
            recoveryScore += (avgEnergyAfter.getAsDouble() - 3.0) * 0.5;
        }
        
        if (avgMuscleSoreness.isPresent()) {
            recoveryScore -= (avgMuscleSoreness.getAsDouble() - 3.0) * 0.3;
        }
        
        return Math.max(1.0, Math.min(5.0, recoveryScore));
    }
    
    /**
     * 동기 수준 계산
     * 참여 일관성, 만족도, 재선택 의향을 종합
     */
    private Double calculateMotivationLevel(List<SessionFeedback> feedbacks) {
        // 재선택 비율
        double repeatRate = feedbacks.stream()
                .filter(f -> f.getWouldRepeat() != null)
                .mapToDouble(f -> f.getWouldRepeat() ? 1.0 : 0.0)
                .average()
                .orElse(0.7);
        
        // 평균 만족도
        double avgSatisfaction = feedbacks.stream()
                .filter(f -> f.getSatisfaction() != null)
                .mapToDouble(f -> (f.getSatisfaction() - 1.0) / 4.0)
                .average()
                .orElse(0.5);
        
        // 참여 일관성 (최근 4주 중 참여한 주 수)
        long participationWeeks = Math.min(feedbacks.size() / 2, 4); // 주 2회 기준
        double consistencyScore = participationWeeks / 4.0;
        
        double motivationScore = (repeatRate * 0.4) + (avgSatisfaction * 0.4) + (consistencyScore * 0.2);
        
        return Math.max(0.0, Math.min(1.0, motivationScore));
    }
    
    /**
     * 신뢰도 점수 계산
     * 데이터 포인트 수와 일관성을 기반으로 계산
     */
    private Double calculateConfidenceScore(List<SessionFeedback> feedbacks) {
        int dataPoints = feedbacks.size();
        
        if (dataPoints < MIN_DATA_POINTS) {
            return Math.max(0.1, dataPoints / (double) MIN_DATA_POINTS * 0.5);
        }
        
        // 데이터 포인트가 많을수록 높은 신뢰도
        double pointScore = Math.min(dataPoints / 10.0, 0.8);
        
        // 데이터 일관성 점수 (평가의 표준편차 기반)
        OptionalDouble satisfactionStdDev = calculateStandardDeviation(
            feedbacks.stream()
                .filter(f -> f.getSatisfaction() != null)
                .mapToDouble(SessionFeedback::getSatisfaction)
        );
        
        double consistencyScore = 0.2;
        if (satisfactionStdDev.isPresent()) {
            consistencyScore = Math.max(0.1, 1.0 - (satisfactionStdDev.getAsDouble() / 2.0));
        }
        
        return Math.min(1.0, pointScore + consistencyScore);
    }
    
    /**
     * 표준편차 계산 도우미 메서드
     */
    private OptionalDouble calculateStandardDeviation(java.util.stream.DoubleStream stream) {
        double[] values = stream.toArray();
        if (values.length == 0) return OptionalDouble.empty();
        
        double mean = java.util.Arrays.stream(values).average().orElse(0.0);
        double variance = java.util.Arrays.stream(values)
                .map(x -> Math.pow(x - mean, 2))
                .average()
                .orElse(0.0);
        
        return OptionalDouble.of(Math.sqrt(variance));
    }
}