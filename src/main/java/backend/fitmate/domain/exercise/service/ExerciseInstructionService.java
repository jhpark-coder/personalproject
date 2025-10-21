package backend.fitmate.domain.exercise.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import backend.fitmate.domain.exercise.entity.ExerciseInstruction;
import backend.fitmate.domain.exercise.repository.ExerciseInstructionRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExerciseInstructionService {

    private final ExerciseInstructionRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public Optional<List<String>> getKoInstructions(String exerciseId) {
        return repository.findByExerciseId(exerciseId)
                .map(e -> {
                    try {
                        return objectMapper.readValue(e.getInstructionsKoJson(), new TypeReference<List<String>>() {});
                    } catch (Exception ex) {
                        return List.<String>of();
                    }
                });
    }

    @Transactional
    public void saveKoInstructions(String exerciseId, String nameKo, List<String> instructionsKo) {
        try {
            String json = objectMapper.writeValueAsString(instructionsKo);
            ExerciseInstruction entity = repository.findByExerciseId(exerciseId)
                    .orElseGet(() -> ExerciseInstruction.builder().exerciseId(exerciseId).build());
            entity.setNameKo(nameKo);
            entity.setInstructionsKoJson(json);
            repository.save(entity);
        } catch (Exception e) {
            throw new RuntimeException("지침 저장 중 오류", e);
        }
    }
} 