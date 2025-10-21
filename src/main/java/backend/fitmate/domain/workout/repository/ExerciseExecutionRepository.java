package backend.fitmate.domain.workout.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.fitmate.domain.workout.entity.ExerciseExecution;
import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.workout.entity.WorkoutSession;

@Repository
public interface ExerciseExecutionRepository extends JpaRepository<ExerciseExecution, Long> {
    
    /**
     * 특정 세션의 운동 실행 기록 조회
     */
    List<ExerciseExecution> findBySession(WorkoutSession session);
    
    /**
     * 사용자별 특정 운동의 실행 기록 조회 (최신순)
     */
    @Query("SELECT ee FROM ExerciseExecution ee JOIN ee.session s WHERE s.user = :user AND ee.exerciseName = :exerciseName ORDER BY s.sessionDate DESC")
    List<ExerciseExecution> findByUserAndExerciseName(@Param("user") User user, @Param("exerciseName") String exerciseName);
    
    /**
     * 사용자별 최근 N일간 특정 운동의 실행 기록 조회
     */
    @Query("SELECT ee FROM ExerciseExecution ee JOIN ee.session s WHERE s.user = :user AND ee.exerciseName = :exerciseName AND s.sessionDate >= :fromDate ORDER BY s.sessionDate DESC")
    List<ExerciseExecution> findRecentExerciseExecutions(@Param("user") User user, @Param("exerciseName") String exerciseName, @Param("fromDate") LocalDateTime fromDate);
    
    /**
     * 사용자별 운동별 평균 완료율 계산을 위한 데이터 조회
     */
    @Query("SELECT ee FROM ExerciseExecution ee JOIN ee.session s WHERE s.user = :user AND ee.exerciseName = :exerciseName AND ee.completedSets IS NOT NULL AND ee.completedReps IS NOT NULL")
    List<ExerciseExecution> findCompletedExecutionsByExercise(@Param("user") User user, @Param("exerciseName") String exerciseName);
    
    /**
     * 사용자별 최근 운동 실행 기록 조회 (최신순)
     */
    @Query("SELECT ee FROM ExerciseExecution ee JOIN ee.session s WHERE s.user = :user ORDER BY s.sessionDate DESC")
    List<ExerciseExecution> findByUserOrderBySessionDateDesc(@Param("user") User user);
    
    /**
     * 사용자별 특정 운동의 평균 RPE 계산
     */
    @Query("SELECT AVG(ee.perceivedExertion) FROM ExerciseExecution ee JOIN ee.session s WHERE s.user = :user AND ee.exerciseName = :exerciseName AND ee.perceivedExertion IS NOT NULL")
    Double findAverageRPEByUserAndExercise(@Param("user") User user, @Param("exerciseName") String exerciseName);
    
    /**
     * 사용자가 수행한 모든 운동 이름 목록 조회
     */
    @Query("SELECT DISTINCT ee.exerciseName FROM ExerciseExecution ee JOIN ee.session s WHERE s.user = :user")
    List<String> findDistinctExerciseNamesByUser(@Param("user") User user);
    
    /**
     * 사용자별 운동 수행 횟수 통계
     */
    @Query("SELECT ee.exerciseName, COUNT(ee) FROM ExerciseExecution ee JOIN ee.session s WHERE s.user = :user GROUP BY ee.exerciseName ORDER BY COUNT(ee) DESC")
    List<Object[]> findExerciseFrequencyByUser(@Param("user") User user);
}