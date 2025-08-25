package backend.fitmate.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.service.UserService;
import backend.fitmate.dto.UserFitnessProfile;
import lombok.extern.slf4j.Slf4j;

/**
 * 하이브리드 운동 추천 서비스
 * 신규 사용자는 기존 템플릿 기반, 기존 사용자는 적응형 추천
 */
@Service
@Slf4j
public class HybridWorkoutRecommendationService {
    
    @Autowired
    private WorkoutRecommendationService templateService;
    
    @Autowired
    private AdaptiveWorkoutRecommendationService adaptiveService;
    
    @Autowired
    private UserFitnessProfileService profileService;
    
    @Autowired
    private UserService userService;
    
    /**
     * 하이브리드 운동 추천
     * 사용자 상태에 따라 템플릿 또는 적응형 추천 선택
     */
    public Map<String, Object> generateRecommendation(Map<String, Object> userData) {
        try {
            // 인증된 사용자인지 확인
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                // 인증된 사용자 - 적응형 추천 시도
                User user = userService.findByEmail(auth.getName()).orElse(null);
                
                if (user != null) {
                    return generateAdaptiveRecommendationForUser(user, userData);
                }
            }
            
            // 비인증 사용자 또는 적응형 추천 실패 - 템플릿 기반 추천
            log.info("템플릿 기반 추천 사용: 비인증 사용자 또는 데이터 부족");
            Map<String, Object> templateRecommendation = templateService.generateRecommendation(userData);
            templateRecommendation.put("type", "template");
            templateRecommendation.put("info", "더 정확한 추천을 위해 회원가입 후 운동 기록을 남겨보세요!");
            
            return templateRecommendation;
            
        } catch (Exception e) {
            log.error("하이브리드 추천 오류, 템플릿으로 폴백: {}", e.getMessage(), e);
            
            // 오류 시 템플릿 추천으로 폴백
            Map<String, Object> fallbackRecommendation = templateService.generateRecommendation(userData);
            fallbackRecommendation.put("type", "template");
            fallbackRecommendation.put("info", "일시적 오류로 기본 추천을 제공합니다");
            
            return fallbackRecommendation;
        }
    }
    
    /**
     * 사용자별 적응형 추천 생성
     */
    private Map<String, Object> generateAdaptiveRecommendationForUser(User user, Map<String, Object> userData) {
        try {
            // 사용자 피트니스 프로필 확인
            UserFitnessProfile profile = profileService.calculateProfile(user);
            
            // 신뢰도가 충분한지 확인
            if (profile.getConfidenceScore() >= 0.4) {
                log.info("적응형 추천 사용: userId={}, 신뢰도={}", user.getId(), profile.getConfidenceScore());
                
                Map<String, Object> adaptiveRecommendation = adaptiveService.generateAdaptiveRecommendation(user, userData);
                adaptiveRecommendation.put("type", "adaptive");
                adaptiveRecommendation.put("learningLevel", getLearningLevel(profile.getConfidenceScore()));
                
                return adaptiveRecommendation;
            } else {
                log.info("데이터 부족으로 템플릿 추천 사용: userId={}, 신뢰도={}", user.getId(), profile.getConfidenceScore());
                
                Map<String, Object> templateRecommendation = templateService.generateRecommendation(userData);
                templateRecommendation.put("type", "template");
                templateRecommendation.put("info", "더 정확한 개인화 추천을 위해 운동 후 피드백을 남겨주세요! (현재 학습도: " + 
                                            Math.round(profile.getConfidenceScore() * 100) + "%)");
                
                return templateRecommendation;
            }
            
        } catch (Exception e) {
            log.error("적응형 추천 실패, 템플릿으로 폴백: userId={}, error={}", user.getId(), e.getMessage(), e);
            
            Map<String, Object> fallbackRecommendation = templateService.generateRecommendation(userData);
            fallbackRecommendation.put("type", "template");
            fallbackRecommendation.put("info", "일시적 오류로 기본 추천을 제공합니다");
            
            return fallbackRecommendation;
        }
    }
    
    /**
     * 학습 수준 라벨 반환
     */
    private String getLearningLevel(Double confidenceScore) {
        if (confidenceScore >= 0.8) return "충분한 학습 완료";
        else if (confidenceScore >= 0.6) return "학습 중 (고급)";
        else if (confidenceScore >= 0.4) return "학습 중 (기본)";
        else return "학습 초기";
    }
    
    /**
     * 기존 템플릿 기반 추천 (호환성 유지)
     */
    public Map<String, Object> getWorkoutTemplates() {
        return templateService.getWorkoutTemplates();
    }
}