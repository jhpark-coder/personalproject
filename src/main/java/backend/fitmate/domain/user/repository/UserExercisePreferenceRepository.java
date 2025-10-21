package backend.fitmate.domain.user.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.user.entity.UserExercisePreference;
import backend.fitmate.domain.user.entity.UserExercisePreferenceId;

@Repository
public interface UserExercisePreferenceRepository extends JpaRepository<UserExercisePreference, UserExercisePreferenceId> {
    
    /**
     * 사용자별 모든 운동 선호도 조회
     */
    List<UserExercisePreference> findByUser(User user);
    
    /**
     * 사용자의 특정 운동 선호도 조회
     */
    Optional<UserExercisePreference> findByUserAndExerciseName(User user, String exerciseName);
    
    /**
     * 사용자별 선호하는 운동 조회 (선호도 점수 0.2 이상)
     */
    @Query("SELECT uep FROM UserExercisePreference uep WHERE uep.user = :user AND uep.preferenceScore >= 0.2 ORDER BY uep.preferenceScore DESC")
    List<UserExercisePreference> findPreferredExercises(@Param("user") User user);
    
    /**
     * 사용자별 비선호 운동 조회 (선호도 점수 -0.2 이하)
     */
    @Query("SELECT uep FROM UserExercisePreference uep WHERE uep.user = :user AND uep.preferenceScore <= -0.2 ORDER BY uep.preferenceScore ASC")
    List<UserExercisePreference> findDislikedExercises(@Param("user") User user);
    
    /**
     * 사용자별 효과적인 운동 조회 (효과 점수 0.7 이상)
     */
    @Query("SELECT uep FROM UserExercisePreference uep WHERE uep.user = :user AND uep.effectivenessScore >= 0.7 ORDER BY uep.effectivenessScore DESC")
    List<UserExercisePreference> findEffectiveExercises(@Param("user") User user);
    
    /**
     * 사용자별 신뢰할 수 있는 선호도 데이터 조회 (데이터 포인트 3 이상)
     */
    @Query("SELECT uep FROM UserExercisePreference uep WHERE uep.user = :user AND uep.dataPoints >= 3 ORDER BY uep.preferenceScore DESC")
    List<UserExercisePreference> findReliablePreferences(@Param("user") User user);
    
    /**
     * 사용자별 선호도 순위 조회 (상위 N개)
     */
    @Query(value = "SELECT uep FROM UserExercisePreference uep WHERE uep.user = :user ORDER BY uep.preferenceScore DESC")
    List<UserExercisePreference> findTopPreferences(@Param("user") User user);
    
    /**
     * 특정 운동의 전체 사용자 평균 선호도 (추천 시 참고용)
     */
    @Query("SELECT AVG(uep.preferenceScore) FROM UserExercisePreference uep WHERE uep.exerciseName = :exerciseName")
    Double findAveragePreferenceByExercise(@Param("exerciseName") String exerciseName);
    
    /**
     * 특정 운동의 전체 사용자 평균 효과도
     */
    @Query("SELECT AVG(uep.effectivenessScore) FROM UserExercisePreference uep WHERE uep.exerciseName = :exerciseName")
    Double findAverageEffectivenessByExercise(@Param("exerciseName") String exerciseName);
    
    /**
     * 사용자별 학습된 운동 개수
     */
    Long countByUser(User user);
    
    /**
     * 사용자별 신뢰할 수 있는 선호도 개수 (데이터 포인트 3 이상)
     */
    @Query("SELECT COUNT(uep) FROM UserExercisePreference uep WHERE uep.user = :user AND uep.dataPoints >= 3")
    Long countReliablePreferencesByUser(@Param("user") User user);
    
    /**
     * 사용자가 선호하는 운동 이름 목록 조회 (선호도 0.2 이상)
     */
    @Query("SELECT uep.exerciseName FROM UserExercisePreference uep WHERE uep.user = :user AND uep.preferenceScore >= 0.2 ORDER BY uep.preferenceScore DESC")
    List<String> findPreferredExerciseNames(@Param("user") User user);
    
    /**
     * 사용자가 비선호하는 운동 이름 목록 조회 (선호도 -0.2 이하)
     */
    @Query("SELECT uep.exerciseName FROM UserExercisePreference uep WHERE uep.user = :user AND uep.preferenceScore <= -0.2")
    List<String> findDislikedExerciseNames(@Param("user") User user);
}