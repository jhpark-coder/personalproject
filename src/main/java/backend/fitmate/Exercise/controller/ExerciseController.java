package backend.fitmate.Exercise.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.Exercise.service.ExerciseService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/exercise-information")
public class ExerciseController {

    private final ExerciseService exerciseService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> searchExercises(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String muscle,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Map<String, Object> result = exerciseService.searchExercisesWithPagination(keyword, muscle, category, page, size);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/muscles")
    public ResponseEntity<List<String>> getMuscles() {
        List<String> muscles = exerciseService.getAllMuscles();
        return ResponseEntity.ok(muscles);
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        List<String> categories = exerciseService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * MET 값이 있는 운동들만 조회
     */
    @GetMapping("/with-mets")
    public ResponseEntity<Map<String, Object>> getExercisesWithMets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String muscle,
            @RequestParam(required = false) String category) {
        try {
            System.out.println("🔍 ExerciseController.getExercisesWithMets 호출됨");
            System.out.println("🔍 파라미터 - page: " + page + ", size: " + size + ", keyword: " + keyword + ", muscle: " + muscle + ", category: " + category);
            // with-mets는 더 이상 별도 의미가 없으므로 통합 검색을 호출
            Map<String, Object> result = exerciseService.searchExercisesWithPagination(keyword, muscle, category, page, size);
            System.out.println("🔍 서비스 호출 완료, 결과: " + result);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.out.println("❌ ExerciseController 예외 발생: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "MET 값이 있는 운동 조회 실패: " + e.getMessage()
            ));
        }
    }

    // Wger 연동 제거로 비활성화
    // @PostMapping("/load-data")
    // public ResponseEntity<Map<String, Object>> loadExerciseData() {
    //     try {
    //         exerciseService.loadExerciseDataFromWger();
    //         return ResponseEntity.ok(Map.of(
    //             "success", true,
    //             "message", "운동 데이터가 성공적으로 로드되었습니다."
    //         ));
    //     } catch (Exception e) {
    //         return ResponseEntity.internalServerError().body(Map.of(
    //             "success", false,
    //             "message", "운동 데이터 로드 실패: " + e.getMessage()
    //         ));
    //     }
    // }
} 