package backend.fitmate.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import backend.fitmate.Exercise.service.ExerciseService;
import java.util.Map;

@RestController
@RequestMapping("/api/exercises")
@CrossOrigin(origins = "*")
public class ExercisesController {

    @Autowired
    private ExerciseService exerciseService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getExercises(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String muscle,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String intensity,
            @RequestParam(required = false) String bodyPart
    ) {
        try {
            Map<String, Object> result = exerciseService.searchExercisesWithPagination(
                keyword, muscle, category, intensity, page, size
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        return ResponseEntity.ok(exerciseService.getAllCategories());
    }

    @GetMapping("/muscles")
    public ResponseEntity<?> getMuscles() {
        return ResponseEntity.ok(exerciseService.getAllMuscles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getExerciseById(@PathVariable Long id) {
        Map<String, Object> result = exerciseService.getExerciseDetailById(id);
        if (result != null) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.notFound().build();
    }
}