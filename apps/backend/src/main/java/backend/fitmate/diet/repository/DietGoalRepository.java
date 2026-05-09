package backend.fitmate.diet.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.fitmate.diet.entity.DietGoal;

@Repository
public interface DietGoalRepository extends JpaRepository<DietGoal, Long> {

    Optional<DietGoal> findByUserId(Long userId);
}
