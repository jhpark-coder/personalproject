package backend.fitmate.domain.workout.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.domain.workout.service.HybridWorkoutRecommendationService;

/**
 * 운동 추천 컨트롤러 - 하이브리드 추천 시스템
 * 기존 API 호환성을 유지하면서 적응형 추천 기능 추가
 */
@RestController
@RequestMapping("/api/workout")
@CrossOrigin(origins = "*")
public class WorkoutRecommendationController {

    @Autowired
    private HybridWorkoutRecommendationService hybridRecommendationService;

    /**
     * 하이브리드 운동 추천
     * 인증된 사용자: 적응형 추천, 비인증 사용자: 템플릿 추천
     */
    @PostMapping("/recommend")
    public ResponseEntity<Map<String, Object>> getWorkoutRecommendation(@RequestBody Map<String, Object> userData) {
        try {
            Map<String, Object> recommendation = hybridRecommendationService.generateRecommendation(userData);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", recommendation);
            
            // 추천 타입에 따른 메시지 설정
            String type = (String) recommendation.getOrDefault("type", "template");
            if ("adaptive".equals(type)) {
                response.put("message", "개인화된 적응형 운동 추천이 완료되었습니다.");
            } else {
                response.put("message", "운동 추천이 완료되었습니다.");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "운동 추천 중 오류가 발생했습니다: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * 운동 템플릿 정보 조회 (기존 API 호환성 유지)
     */
    @GetMapping("/templates")
    public ResponseEntity<Map<String, Object>> getWorkoutTemplates() {
        try {
            Map<String, Object> templates = hybridRecommendationService.getWorkoutTemplates();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", templates);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "운동 템플릿 조회 중 오류가 발생했습니다: " + e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}