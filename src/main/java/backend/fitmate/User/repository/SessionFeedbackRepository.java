package backend.fitmate.User.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.fitmate.User.entity.SessionFeedback;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.WorkoutSession;

@Repository
public interface SessionFeedbackRepository extends JpaRepository<SessionFeedback, Long> {
    
    /**
     * 특정 세션의 피드백 조회
     */
    Optional<SessionFeedback> findBySession(WorkoutSession session);
    
    /**
     * 사용자별 모든 피드백 조회 (최신순)
     */
    @Query("SELECT sf FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user ORDER BY sf.createdAt DESC")
    List<SessionFeedback> findByUserOrderByCreatedAtDesc(@Param("user") User user);
    
    /**
     * 사용자별 최근 N일간의 피드백 조회
     */
    @Query("SELECT sf FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user AND sf.createdAt >= :fromDate ORDER BY sf.createdAt DESC")
    List<SessionFeedback> findRecentFeedback(@Param("user") User user, @Param("fromDate") LocalDateTime fromDate);
    
    /**
     * 사용자별 특정 목표의 피드백 조회
     */
    @Query("SELECT sf FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user AND s.goal = :goal ORDER BY sf.createdAt DESC")
    List<SessionFeedback> findByUserAndGoal(@Param("user") User user, @Param("goal") String goal);
    
    /**
     * 사용자별 평균 만족도 계산
     */
    @Query("SELECT AVG(sf.satisfaction) FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user AND sf.satisfaction IS NOT NULL")
    Double findAverageSatisfactionByUser(@Param("user") User user);
    
    /**
     * 사용자별 평균 완료율 계산
     */
    @Query("SELECT AVG(sf.completionRate) FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user AND sf.completionRate IS NOT NULL")
    Double findAverageCompletionRateByUser(@Param("user") User user);
    
    /**
     * 사용자별 평균 난이도 계산
     */
    @Query("SELECT AVG(sf.overallDifficulty) FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user AND sf.overallDifficulty IS NOT NULL")
    Double findAverageDifficultyByUser(@Param("user") User user);
    
    /**
     * 사용자별 재선택률 계산
     */
    @Query("SELECT COUNT(sf) * 1.0 / (SELECT COUNT(sf2) FROM SessionFeedback sf2 JOIN sf2.session s2 WHERE s2.user = :user) FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user AND sf.wouldRepeat = true")
    Double findRepeatRateByUser(@Param("user") User user);
    
    /**
     * 사용자별 최근 진행 상태 추이 분석을 위한 데이터 조회
     * 시간 순서대로 정렬하여 트렌드 분석 가능
     */
    @Query("SELECT sf FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user AND sf.createdAt >= :fromDate AND sf.completionRate IS NOT NULL AND sf.satisfaction IS NOT NULL ORDER BY sf.createdAt ASC")
    List<SessionFeedback> findProgressTrendData(@Param("user") User user, @Param("fromDate") LocalDateTime fromDate);
    
    /**
     * 성공적인 세션(완료율 80% 이상, 만족도 4 이상) 조회
     */
    @Query("SELECT sf FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user AND sf.completionRate >= 0.8 AND sf.satisfaction >= 4 ORDER BY sf.createdAt DESC")
    List<SessionFeedback> findSuccessfulSessions(@Param("user") User user);
    
    /**
     * 어려움을 겪은 세션(완료율 60% 이하 또는 난이도 4 이상) 조회
     */
    @Query("SELECT sf FROM SessionFeedback sf JOIN sf.session s WHERE s.user = :user AND (sf.completionRate <= 0.6 OR sf.overallDifficulty >= 4) ORDER BY sf.createdAt DESC")
    List<SessionFeedback> findDifficultSessions(@Param("user") User user);
}