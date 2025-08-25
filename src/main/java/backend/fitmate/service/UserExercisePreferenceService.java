package backend.fitmate.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.UserExercisePreference;
import backend.fitmate.User.repository.UserExercisePreferenceRepository;
import lombok.extern.slf4j.Slf4j;

/**
 * 사용자 운동 선호도 관리 서비스
 * 피드백을 통한 학습과 선호도 업데이트 담당
 */
@Service
@Slf4j
@Transactional
public class UserExercisePreferenceService {
    
    @Autowired
    private UserExercisePreferenceRepository preferenceRepository;
    
    /**
     * 운동 선호도 업데이트
     * 기존 선호도가 있으면 업데이트, 없으면 새로 생성
     */
    public void updatePreference(User user, String exerciseName, Double preferenceScore, Double effectivenessScore) {
        log.debug("선호도 업데이트: userId={}, exercise={}, preference={}, effectiveness={}", 
                user.getId(), exerciseName, preferenceScore, effectivenessScore);
        
        Optional<UserExercisePreference> existingPref = preferenceRepository.findByUserAndExerciseName(user, exerciseName);
        
        UserExercisePreference preference;
        if (existingPref.isPresent()) {
            preference = existingPref.get();
            
            // 학습률: 데이터가 적을수록 높게, 많을수록 낮게
            double learningRate = calculateLearningRate(preference.getDataPoints());
            
            // 선호도 업데이트
            if (preferenceScore != null) {
                preference.updatePreferenceScore(preferenceScore, learningRate);
            }
            
            // 효과도 업데이트
            if (effectivenessScore != null) {
                preference.updateEffectivenessScore(effectivenessScore, learningRate);
            }
        } else {
            // 새로운 선호도 생성
            preference = UserExercisePreference.builder()
                    .user(user)
                    .exerciseName(exerciseName)
                    .preferenceScore(java.math.BigDecimal.valueOf(preferenceScore != null ? preferenceScore : 0.0))
                    .effectivenessScore(java.math.BigDecimal.valueOf(effectivenessScore != null ? effectivenessScore : 0.5))
                    .dataPoints(1)
                    .build();
        }
        
        preferenceRepository.save(preference);
        
        log.debug("선호도 업데이트 완료: userId={}, exercise={}, 새로운점수={}, 데이터포인트={}", 
                user.getId(), exerciseName, preference.getPreferenceScore(), preference.getDataPoints());
    }
    
    /**
     * 학습률 계산
     * 데이터 포인트가 적을수록 큰 변화, 많을수록 작은 변화
     */
    private double calculateLearningRate(Integer dataPoints) {
        if (dataPoints == null || dataPoints <= 1) return 0.3; // 초기 학습률: 30%
        if (dataPoints <= 3) return 0.2; // 20%
        if (dataPoints <= 5) return 0.15; // 15%
        if (dataPoints <= 10) return 0.1; // 10%
        return 0.05; // 최소 학습률: 5%
    }
    
    /**
     * 사용자의 모든 운동 선호도 조회
     */
    @Transactional(readOnly = true)
    public List<UserExercisePreference> getUserPreferences(User user) {
        return preferenceRepository.findByUser(user);
    }
    
    /**
     * 특정 운동에 대한 사용자 선호도 조회
     */
    @Transactional(readOnly = true)
    public Optional<UserExercisePreference> getExercisePreference(User user, String exerciseName) {
        return preferenceRepository.findByUserAndExerciseName(user, exerciseName);
    }
    
    /**
     * 사용자가 선호하는 운동 목록 조회
     */
    @Transactional(readOnly = true)
    public List<UserExercisePreference> getPreferredExercises(User user) {
        return preferenceRepository.findPreferredExercises(user);
    }
    
    /**
     * 사용자가 비선호하는 운동 목록 조회
     */
    @Transactional(readOnly = true)
    public List<UserExercisePreference> getDislikedExercises(User user) {
        return preferenceRepository.findDislikedExercises(user);
    }
    
    /**
     * 사용자에게 효과적인 운동 목록 조회
     */
    @Transactional(readOnly = true)
    public List<UserExercisePreference> getEffectiveExercises(User user) {
        return preferenceRepository.findEffectiveExercises(user);
    }
    
    /**
     * 신뢰할 수 있는 선호도 데이터만 조회 (데이터 포인트 3 이상)
     */
    @Transactional(readOnly = true)
    public List<UserExercisePreference> getReliablePreferences(User user) {
        return preferenceRepository.findReliablePreferences(user);
    }
    
    /**
     * 운동 선호도 점수 조회 (기본값 0.0)
     */
    @Transactional(readOnly = true)
    public Double getPreferenceScore(User user, String exerciseName) {
        return preferenceRepository.findByUserAndExerciseName(user, exerciseName)
                .map(pref -> pref.getPreferenceScore().doubleValue())
                .orElse(0.0);
    }
    
    /**
     * 운동 효과도 점수 조회 (기본값 0.5)
     */
    @Transactional(readOnly = true)
    public Double getEffectivenessScore(User user, String exerciseName) {
        return preferenceRepository.findByUserAndExerciseName(user, exerciseName)
                .map(pref -> pref.getEffectivenessScore().doubleValue())
                .orElse(0.5);
    }
    
    /**
     * 선호도 신뢰도 점수 조회 (기본값 0.0)
     */
    @Transactional(readOnly = true)
    public Double getConfidenceScore(User user, String exerciseName) {
        return preferenceRepository.findByUserAndExerciseName(user, exerciseName)
                .map(UserExercisePreference::getConfidenceScore)
                .orElse(0.0);
    }
    
    /**
     * 사용자가 선호하는 운동 이름 목록 조회
     */
    @Transactional(readOnly = true)
    public List<String> getPreferredExerciseNames(User user) {
        return preferenceRepository.findPreferredExerciseNames(user);
    }
    
    /**
     * 사용자가 비선호하는 운동 이름 목록 조회
     */
    @Transactional(readOnly = true)
    public List<String> getDislikedExerciseNames(User user) {
        return preferenceRepository.findDislikedExerciseNames(user);
    }
    
    /**
     * 운동별 선호도 통계 정보 조회
     */
    @Transactional(readOnly = true)
    public PreferenceStats getPreferenceStats(User user) {
        List<UserExercisePreference> allPreferences = preferenceRepository.findByUser(user);
        
        long totalExercises = allPreferences.size();
        long preferredCount = allPreferences.stream()
                .mapToLong(p -> p.getPreferenceScore().doubleValue() >= 0.2 ? 1 : 0)
                .sum();
        long dislikedCount = allPreferences.stream()
                .mapToLong(p -> p.getPreferenceScore().doubleValue() <= -0.2 ? 1 : 0)
                .sum();
        long reliableCount = allPreferences.stream()
                .mapToLong(p -> p.getDataPoints() >= 3 ? 1 : 0)
                .sum();
        
        return new PreferenceStats(totalExercises, preferredCount, dislikedCount, reliableCount);
    }
    
    /**
     * 선호도 통계 정보 클래스
     */
    public record PreferenceStats(
            long totalExercises,
            long preferredCount,
            long dislikedCount,
            long reliableCount
    ) {}
}