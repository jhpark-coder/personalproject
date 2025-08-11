package backend.fitmate.Exercise.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.Exercise.service.ExerciseInstructionService;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/exercises/instructions")
@RequiredArgsConstructor
public class ExerciseInstructionController {

    private final ExerciseInstructionService service;

    @GetMapping("/{exerciseId}")
    public ResponseEntity<?> get(@PathVariable String exerciseId) {
        return service.getKoInstructions(exerciseId)
                .<ResponseEntity<?>>map(list -> ResponseEntity.ok(Map.of("success", true, "data", list)))
                .orElseGet(() -> ResponseEntity.ok(Map.of("success", true, "data", List.of())));
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody SaveRequest req) {
        service.saveKoInstructions(req.getExerciseId(), req.getNameKo(), req.getInstructionsKo());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @Data
    public static class SaveRequest {
        private String exerciseId;
        private String nameKo;
        private List<String> instructionsKo;
    }
} 