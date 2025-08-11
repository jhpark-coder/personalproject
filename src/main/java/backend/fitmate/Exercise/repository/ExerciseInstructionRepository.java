package backend.fitmate.Exercise.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.fitmate.Exercise.entity.ExerciseInstruction;

public interface ExerciseInstructionRepository extends JpaRepository<ExerciseInstruction, Long> {
    Optional<ExerciseInstruction> findByExerciseId(String exerciseId);
} 