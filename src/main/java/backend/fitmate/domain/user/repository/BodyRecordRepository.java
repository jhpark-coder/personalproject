package backend.fitmate.domain.user.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.fitmate.domain.user.entity.BodyRecord;

@Repository
public interface BodyRecordRepository extends JpaRepository<BodyRecord, Long> {
    
    /**
     * 사용자의 모든 신체 기록 조회
     */
    List<BodyRecord> findByUserIdOrderByMeasureDateDesc(Long userId);
    
    /**
     * 사용자의 특정 기간 신체 기록 조회
     */
    List<BodyRecord> findByUserIdAndMeasureDateBetweenOrderByMeasureDateDesc(
        Long userId, LocalDate startDate, LocalDate endDate);
    
    /**
     * 사용자의 특정 날짜 신체 기록 조회
     */
    Optional<BodyRecord> findByUserIdAndMeasureDate(Long userId, LocalDate measureDate);
    
    /**
     * 사용자의 최근 신체 기록 조회 (최근 N개)
     */
    @Query("SELECT br FROM BodyRecord br WHERE br.user.id = :userId ORDER BY br.measureDate DESC")
    List<BodyRecord> findRecentBodyRecordsByUserId(@Param("userId") Long userId);
    
    /**
     * 사용자의 월별 신체 변화 통계
     */
    @Query("SELECT AVG(br.weight), AVG(br.bodyFatPercentage), AVG(br.muscleMass), " +
           "MIN(br.weight), MAX(br.weight), " +
           "MIN(br.bodyFatPercentage), MAX(br.bodyFatPercentage), " +
           "MIN(br.muscleMass), MAX(br.muscleMass) " +
           "FROM BodyRecord br " +
           "WHERE br.user.id = :userId " +
           "AND br.measureDate BETWEEN :startDate AND :endDate")
    Object[] getMonthlyBodyStats(@Param("userId") Long userId,
                                @Param("startDate") LocalDate startDate,
                                @Param("endDate") LocalDate endDate);
    
    /**
     * 사용자의 체중 변화 추이 (최근 5일)
     */
    @Query("SELECT br.measureDate, br.weight " +
           "FROM BodyRecord br " +
           "WHERE br.user.id = :userId " +
           "AND br.measureDate BETWEEN :startDate AND :endDate " +
           "ORDER BY br.measureDate ASC")
    List<Object[]> getWeightTrend(@Param("userId") Long userId,
                                 @Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);
    
    /**
     * 사용자의 체지방률 변화 추이 (최근 5일)
     */
    @Query("SELECT br.measureDate, br.bodyFatPercentage " +
           "FROM BodyRecord br " +
           "WHERE br.user.id = :userId " +
           "AND br.measureDate BETWEEN :startDate AND :endDate " +
           "ORDER BY br.measureDate ASC")
    List<Object[]> getBodyFatTrend(@Param("userId") Long userId,
                                  @Param("startDate") LocalDate startDate,
                                  @Param("endDate") LocalDate endDate);
    
    /**
     * 사용자의 근육량 변화 추이 (최근 5일)
     */
    @Query("SELECT br.measureDate, br.muscleMass " +
           "FROM BodyRecord br " +
           "WHERE br.user.id = :userId " +
           "AND br.measureDate BETWEEN :startDate AND :endDate " +
           "ORDER BY br.measureDate ASC")
    List<Object[]> getMuscleMassTrend(@Param("userId") Long userId,
                                     @Param("startDate") LocalDate startDate,
                                     @Param("endDate") LocalDate endDate);

    /**
     * 사용자의 체중 변화 추이 (주별 - 최근 4주)
     */
    @Query(value = "SELECT DATE_FORMAT(br.measure_date - INTERVAL WEEKDAY(br.measure_date) DAY, '%Y-%m-%d') as week_start, AVG(br.weight) " +
           "FROM body_records br " +
           "WHERE br.user_id = :userId " +
           "AND br.measure_date BETWEEN :startDate AND :endDate " +
           "GROUP BY week_start " +
           "ORDER BY week_start ASC " +
           "LIMIT 4", nativeQuery = true)
    List<Object[]> getWeightTrendWeekly(@Param("userId") Long userId,
                                       @Param("startDate") LocalDate startDate,
                                       @Param("endDate") LocalDate endDate);
    
    /**
     * 사용자의 체지방률 변화 추이 (주별 - 최근 4주)
     */
    @Query(value = "SELECT DATE_FORMAT(br.measure_date - INTERVAL WEEKDAY(br.measure_date) DAY, '%Y-%m-%d') as week_start, AVG(br.body_fat_percentage) " +
           "FROM body_records br " +
           "WHERE br.user_id = :userId " +
           "AND br.measure_date BETWEEN :startDate AND :endDate " +
           "GROUP BY week_start " +
           "ORDER BY week_start ASC " +
           "LIMIT 4", nativeQuery = true)
    List<Object[]> getBodyFatTrendWeekly(@Param("userId") Long userId,
                                        @Param("startDate") LocalDate startDate,
                                        @Param("endDate") LocalDate endDate);
    
    /**
     * 사용자의 근육량 변화 추이 (주별 - 최근 4주)
     */
    @Query(value = "SELECT DATE_FORMAT(br.measure_date - INTERVAL WEEKDAY(br.measure_date) DAY, '%Y-%m-%d') as week_start, AVG(br.muscle_mass) " +
           "FROM body_records br " +
           "WHERE br.user_id = :userId " +
           "AND br.measure_date BETWEEN :startDate AND :endDate " +
           "GROUP BY week_start " +
           "ORDER BY week_start ASC " +
           "LIMIT 4", nativeQuery = true)
    List<Object[]> getMuscleMassTrendWeekly(@Param("userId") Long userId,
                                           @Param("startDate") LocalDate startDate,
                                           @Param("endDate") LocalDate endDate);

    /**
     * 사용자의 체중 변화 추이 (월별 - 최근 3개월)
     */
    @Query("SELECT CONCAT(YEAR(br.measureDate), '-', CASE WHEN MONTH(br.measureDate) < 10 THEN CONCAT('0', MONTH(br.measureDate)) ELSE CAST(MONTH(br.measureDate) AS string) END) as month_start, AVG(br.weight) " +
           "FROM BodyRecord br " +
           "WHERE br.user.id = :userId " +
           "AND br.measureDate BETWEEN :startDate AND :endDate " +
           "GROUP BY YEAR(br.measureDate), MONTH(br.measureDate), CONCAT(YEAR(br.measureDate), '-', CASE WHEN MONTH(br.measureDate) < 10 THEN CONCAT('0', MONTH(br.measureDate)) ELSE CAST(MONTH(br.measureDate) AS string) END) " +
           "ORDER BY month_start ASC " +
           "LIMIT 3")
    List<Object[]> getWeightTrendMonthly(@Param("userId") Long userId,
                                        @Param("startDate") LocalDate startDate,
                                        @Param("endDate") LocalDate endDate);
    
    /**
     * 사용자의 체지방률 변화 추이 (월별 - 최근 3개월)
     */
    @Query("SELECT CONCAT(YEAR(br.measureDate), '-', CASE WHEN MONTH(br.measureDate) < 10 THEN CONCAT('0', MONTH(br.measureDate)) ELSE CAST(MONTH(br.measureDate) AS string) END) as month_start, AVG(br.bodyFatPercentage) " +
           "FROM BodyRecord br " +
           "WHERE br.user.id = :userId " +
           "AND br.measureDate BETWEEN :startDate AND :endDate " +
           "GROUP BY YEAR(br.measureDate), MONTH(br.measureDate), CONCAT(YEAR(br.measureDate), '-', CASE WHEN MONTH(br.measureDate) < 10 THEN CONCAT('0', MONTH(br.measureDate)) ELSE CAST(MONTH(br.measureDate) AS string) END) " +
           "ORDER BY month_start ASC " +
           "LIMIT 3")
    List<Object[]> getBodyFatTrendMonthly(@Param("userId") Long userId,
                                         @Param("startDate") LocalDate startDate,
                                         @Param("endDate") LocalDate endDate);
    
    /**
     * 사용자의 근육량 변화 추이 (월별 - 최근 3개월)
     */
    @Query("SELECT CONCAT(YEAR(br.measureDate), '-', CASE WHEN MONTH(br.measureDate) < 10 THEN CONCAT('0', MONTH(br.measureDate)) ELSE CAST(MONTH(br.measureDate) AS string) END) as month_start, AVG(br.muscleMass) " +
           "FROM BodyRecord br " +
           "WHERE br.user.id = :userId " +
           "AND br.measureDate BETWEEN :startDate AND :endDate " +
           "GROUP BY YEAR(br.measureDate), MONTH(br.measureDate), CONCAT(YEAR(br.measureDate), '-', CASE WHEN MONTH(br.measureDate) < 10 THEN CONCAT('0', MONTH(br.measureDate)) ELSE CAST(MONTH(br.measureDate) AS string) END) " +
           "ORDER BY month_start ASC " +
           "LIMIT 3")
    List<Object[]> getMuscleMassTrendMonthly(@Param("userId") Long userId,
                                            @Param("startDate") LocalDate startDate,
                                            @Param("endDate") LocalDate endDate);

    /**
     * 사용자의 모든 신체 기록 삭제
     */
    void deleteByUserId(Long userId);

    /**
     * 사용자의 신체 기록 개수 조회
     */
    long countByUserId(Long userId);
} 