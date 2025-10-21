package backend.fitmate.domain.exercise.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.fitmate.domain.exercise.entity.Exercise;

@Repository
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {


    /**
     * 운동 이름(대소문자 구분 없이)으로 검색합니다.
     * @param name 검색할 운동 이름의 일부
     * @return List<Exercise>
     */
    List<Exercise> findByNameContainingIgnoreCase(String name);

    /**
     * 한국어 운동 이름으로 운동을 찾습니다.
     * @param koreanName 한국어 운동 이름
     * @return Optional<Exercise>
     */
    Optional<Exercise> findByKoreanName(String koreanName);

    /**
     * 운동 이름(대소문자 구분 없이)으로 검색합니다. (페이지네이션 지원)
     * @param name 검색할 운동 이름의 일부
     * @param pageable 페이지네이션 정보
     * @return Page<Exercise>
     */
    Page<Exercise> findByNameContainingIgnoreCase(String name, Pageable pageable);

    /**
     * 근육 이름을 포함하는 운동들을 찾습니다.
     * @param muscle 검색할 근육 이름
     * @return List<Exercise>
     */
    @Query("SELECT e FROM Exercise e WHERE EXISTS (SELECT 1 FROM e.muscles m WHERE m LIKE %:muscle%)")
    List<Exercise> findByMusclesContaining(@Param("muscle") String muscle);

    /**
     * 근육 이름을 포함하는 운동들을 찾습니다. (페이지네이션 지원)
     * @param muscle 검색할 근육 이름
     * @param pageable 페이지네이션 정보
     * @return Page<Exercise>
     */
    @Query("SELECT e FROM Exercise e WHERE EXISTS (SELECT 1 FROM e.muscles m WHERE m LIKE %:muscle%)")
    Page<Exercise> findByMusclesContaining(@Param("muscle") String muscle, Pageable pageable);

    /**
     * 운동 이름과 근육 이름을 모두 포함하는 운동들을 찾습니다.
     * @param name 검색할 운동 이름의 일부
     * @param muscle 검색할 근육 이름
     * @return List<Exercise>
     */
    @Query("SELECT e FROM Exercise e WHERE e.name LIKE %:name% AND EXISTS (SELECT 1 FROM e.muscles m WHERE m LIKE %:muscle%)")
    List<Exercise> findByNameContainingIgnoreCaseAndMusclesContaining(@Param("name") String name, @Param("muscle") String muscle);

    /**
     * 모든 고유한 근육 이름을 가져옵니다.
     * @return List<String>
     */
    @Query("SELECT DISTINCT m FROM Exercise e JOIN e.muscles m ORDER BY m")
    List<String> findAllDistinctMuscles();
    
    /**
     * 모든 운동을 페이지네이션 없이 가져옵니다.
     * @return List<Exercise>
     */
    @Query(value = "SELECT * FROM exercise ORDER BY id ASC", nativeQuery = true)
    List<Exercise> findAllExercises();

    // MET 값이 설정된 운동들만 조회
    List<Exercise> findByMetsIsNotNull();

    /**
     * 모든 고유한 카테고리(시드의 target_areas 기반 1차 카테고리)를 가져옵니다.
     */
    @Query("SELECT DISTINCT e.category FROM Exercise e WHERE e.category IS NOT NULL ORDER BY e.category")
    List<String> findAllDistinctCategories();

    @Query("SELECT e FROM Exercise e WHERE EXISTS (SELECT 1 FROM e.muscles m WHERE LOWER(m) LIKE LOWER(CONCAT('%', :muscle, '%'))) OR EXISTS (SELECT 1 FROM e.musclesSecondary ms WHERE LOWER(ms) LIKE LOWER(CONCAT('%', :muscle, '%')))")
    List<Exercise> findByAnyMuscleContaining(@Param("muscle") String muscle);

    @Query("SELECT e FROM Exercise e WHERE LOWER(e.name) LIKE LOWER(CONCAT('%', :name, '%')) AND (EXISTS (SELECT 1 FROM e.muscles m WHERE LOWER(m) LIKE LOWER(CONCAT('%', :muscle, '%'))) OR EXISTS (SELECT 1 FROM e.musclesSecondary ms WHERE LOWER(ms) LIKE LOWER(CONCAT('%', :muscle, '%'))))")
    List<Exercise> findByNameContainingIgnoreCaseAndAnyMuscleContaining(@Param("name") String name, @Param("muscle") String muscle);
} 