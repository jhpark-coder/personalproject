package backend.fitmate.domain.workout.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.fitmate.domain.workout.entity.WorkoutRecord;

@Repository
public interface WorkoutRecordRepository extends JpaRepository<WorkoutRecord, Long> {
    
    /**
     * 사용자의 모든 운동 기록 조회
     */
    List<WorkoutRecord> findByUserIdOrderByWorkoutDateDesc(Long userId);
    
    /**
     * 사용자의 특정 기간 운동 기록 조회
     */
    List<WorkoutRecord> findByUserIdAndWorkoutDateBetweenOrderByWorkoutDateDesc(
        Long userId, LocalDate startDate, LocalDate endDate);
    
    /**
     * 사용자의 특정 날짜 운동 기록 조회
     */
    List<WorkoutRecord> findByUserIdAndWorkoutDateOrderByCreatedAtDesc(Long userId, LocalDate workoutDate);
    
    /**
     * 사용자의 운동 종류별 기록 조회
     */
    List<WorkoutRecord> findByUserIdAndWorkoutTypeOrderByWorkoutDateDesc(Long userId, String workoutType);
    
    /**
     * 사용자의 난이도별 운동 기록 조회
     */
    List<WorkoutRecord> findByUserIdAndDifficultyOrderByWorkoutDateDesc(Long userId, WorkoutRecord.WorkoutDifficulty difficulty);
    
    /**
     * 사용자의 최근 운동 기록 조회 (최근 N개)
     */
    @Query("SELECT wr FROM WorkoutRecord wr WHERE wr.user.id = :userId ORDER BY wr.workoutDate DESC, wr.createdAt DESC")
    List<WorkoutRecord> findRecentWorkoutsByUserId(@Param("userId") Long userId);
    
    /**
     * 사용자의 월별 운동 통계
     */
    @Query("SELECT COUNT(wr), SUM(wr.duration), SUM(wr.calories) " +
           "FROM WorkoutRecord wr " +
           "WHERE wr.user.id = :userId " +
           "AND wr.workoutDate BETWEEN :startDate AND :endDate")
    Object[] getMonthlyWorkoutStats(@Param("userId") Long userId, 
                                   @Param("startDate") LocalDate startDate, 
                                   @Param("endDate") LocalDate endDate);
    
    /**
     * 사용자의 운동 난이도 분포
     */
    @Query("SELECT wr.difficulty, COUNT(wr) " +
           "FROM WorkoutRecord wr " +
           "WHERE wr.user.id = :userId " +
           "AND wr.workoutDate BETWEEN :startDate AND :endDate " +
           "GROUP BY wr.difficulty")
    List<Object[]> getDifficultyDistribution(@Param("userId") Long userId,
                                           @Param("startDate") LocalDate startDate,
                                           @Param("endDate") LocalDate endDate);
    
    /**
     * 사용자의 운동 종류별 통계
     */
    @Query("SELECT wr.workoutType, COUNT(wr), AVG(wr.duration), AVG(wr.calories) " +
           "FROM WorkoutRecord wr " +
           "WHERE wr.user.id = :userId " +
           "AND wr.workoutDate BETWEEN :startDate AND :endDate " +
           "GROUP BY wr.workoutType")
    List<Object[]> getWorkoutTypeStats(@Param("userId") Long userId,
                                      @Param("startDate") LocalDate startDate,
                                      @Param("endDate") LocalDate endDate);

    /**
     * 사용자의 주별 운동 통계 (최근 5주)
     */
    @Query(value = "SELECT YEARWEEK(wr.workout_date, 1) as week, " +
           "SUM(COALESCE(wr.duration, 0)) as totalDuration, " +
           "COUNT(wr.id) as workoutCount " +
           "FROM workout_records wr " +
           "WHERE wr.user_id = :userId " +
           "AND wr.workout_date >= DATE_SUB(CURDATE(), INTERVAL 5 WEEK) " +
           "GROUP BY YEARWEEK(wr.workout_date, 1) " +
           "ORDER BY week DESC " +
           "LIMIT 5", nativeQuery = true)
    List<Object[]> getWeeklyWorkoutStats(@Param("userId") Long userId);

    /**
     * 사용자의 이번 주 vs 저번 주 운동 시간과 칼로리 비교
     */
    @Query(value = "SELECT " +
           "SUM(CASE WHEN YEARWEEK(wr.workout_date, 1) = YEARWEEK(CURDATE(), 1) THEN COALESCE(wr.duration, 0) ELSE 0 END) as thisWeekDuration, " +
           "SUM(CASE WHEN YEARWEEK(wr.workout_date, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1) THEN COALESCE(wr.duration, 0) ELSE 0 END) as lastWeekDuration, " +
           "SUM(CASE WHEN YEARWEEK(wr.workout_date, 1) = YEARWEEK(CURDATE(), 1) THEN COALESCE(wr.calories, 0) ELSE 0 END) as thisWeekCalories, " +
           "SUM(CASE WHEN YEARWEEK(wr.workout_date, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1) THEN COALESCE(wr.calories, 0) ELSE 0 END) as lastWeekCalories " +
           "FROM workout_records wr " +
           "WHERE wr.user_id = :userId " +
           "AND wr.workout_date >= DATE_SUB(CURDATE(), INTERVAL 2 WEEK)", nativeQuery = true)
    List<Object[]> getWeeklyComparison(@Param("userId") Long userId);

    /**
     * 사용자의 모든 운동 기록 삭제
     */
    void deleteByUserId(Long userId);

    /**
     * 사용자의 운동 기록 개수 조회
     */
    long countByUserId(Long userId);
} 