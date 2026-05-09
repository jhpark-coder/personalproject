package backend.fitmate.diet.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.fitmate.diet.entity.DietEntry;

@Repository
public interface DietEntryRepository extends JpaRepository<DietEntry, Long> {

    List<DietEntry> findByUserIdAndEatenAtBetweenOrderByEatenAtAscCreatedAtAsc(
        Long userId,
        LocalDateTime start,
        LocalDateTime end
    );

    Optional<DietEntry> findByIdAndUserId(Long id, Long userId);

    @Query("""
        SELECT entry.foodName, COUNT(entry)
        FROM DietEntry entry
        WHERE entry.user.id = :userId
          AND entry.eatenAt >= :since
        GROUP BY entry.foodName
        ORDER BY COUNT(entry) DESC, MAX(entry.eatenAt) DESC
        """)
    List<Object[]> findFrequentFoodNames(
        @Param("userId") Long userId,
        @Param("since") LocalDateTime since
    );
}
