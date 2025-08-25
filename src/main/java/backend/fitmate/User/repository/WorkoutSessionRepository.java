package backend.fitmate.User.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.WorkoutSession;

@Repository
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {
    
    /**
     * 사용자별 운동 세션 조회 (최신순)
     */
    List<WorkoutSession> findByUserOrderBySessionDateDesc(User user);
    
    /**
     * 사용자별 최근 N일간의 운동 세션 조회
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.sessionDate >= :fromDate ORDER BY ws.sessionDate DESC")
    List<WorkoutSession> findRecentSessions(@Param("user") User user, @Param("fromDate") LocalDateTime fromDate);
    
    /**
     * 사용자별 특정 목표의 운동 세션 조회
     */
    List<WorkoutSession> findByUserAndGoalOrderBySessionDateDesc(User user, String goal);
    
    /**
     * 피드백이 있는 세션만 조회
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.feedback IS NOT NULL ORDER BY ws.sessionDate DESC")
    List<WorkoutSession> findSessionsWithFeedback(@Param("user") User user);
    
    /**
     * 사용자의 최근 피드백 있는 세션 조회 (제한)
     */
    @Query(value = "SELECT ws FROM WorkoutSession ws WHERE ws.user = :user AND ws.feedback IS NOT NULL ORDER BY ws.sessionDate DESC", 
           nativeQuery = false)
    List<WorkoutSession> findRecentSessionsWithFeedback(@Param("user") User user);
    
    /**
     * 사용자별 총 세션 수
     */
    Long countByUser(User user);
    
    /**
     * 사용자별 특정 기간 내 세션 수
     */
    @Query("SELECT COUNT(ws) FROM WorkoutSession ws WHERE ws.user = :user AND ws.sessionDate >= :fromDate")
    Long countRecentSessions(@Param("user") User user, @Param("fromDate") LocalDateTime fromDate);
    
    /**
     * 사용자의 가장 최근 세션 조회
     */
    Optional<WorkoutSession> findFirstByUserOrderBySessionDateDesc(User user);
    
    /**
     * 목표별 평균 완료율 계산을 위한 쿼리
     */
    @Query("SELECT ws FROM WorkoutSession ws JOIN ws.feedback sf WHERE ws.user = :user AND ws.goal = :goal AND sf.completionRate IS NOT NULL")
    List<WorkoutSession> findSessionsWithCompletionRateByGoal(@Param("user") User user, @Param("goal") String goal);
}