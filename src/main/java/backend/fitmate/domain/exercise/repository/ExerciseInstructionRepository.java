package backend.fitmate.domain.exercise.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.fitmate.domain.exercise.entity.ExerciseInstruction;

public interface ExerciseInstructionRepository extends JpaRepository<ExerciseInstruction, Long> {
    Optional<ExerciseInstruction> findByExerciseId(String exerciseId);
} 