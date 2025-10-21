package backend.fitmate.domain.workout.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.workout.entity.WorkoutRecord;
import backend.fitmate.domain.workout.repository.WorkoutRecordRepository;
import lombok.RequiredArgsConstructor;
import backend.fitmate.domain.user.repository.UserRepository;
import backend.fitmate.domain.user.service.UserService;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkoutRecordService {

    private final WorkoutRecordRepository workoutRecordRepository;
    private final UserService userService;

    /**
     * 운동 기록 저장
     */
    public WorkoutRecord saveWorkoutRecord(Long userId, WorkoutRecord workoutRecord) {
        User user = userService.findById(userId)
            .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        workoutRecord.setUser(user);
        return workoutRecordRepository.save(workoutRecord);
    }

    /**
     * 사용자의 모든 운동 기록 조회
     */
    @Transactional(readOnly = true)
    public List<WorkoutRecord> getUserWorkoutRecords(Long userId) {
        return workoutRecordRepository.findByUserIdOrderByWorkoutDateDesc(userId);
    }

    /**
     * 사용자의 특정 기간 운동 기록 조회
     */
    @Transactional(readOnly = true)
    public List<WorkoutRecord> getUserWorkoutRecordsByPeriod(Long userId, LocalDate startDate, LocalDate endDate) {
        return workoutRecordRepository.findByUserIdAndWorkoutDateBetweenOrderByWorkoutDateDesc(userId, startDate, endDate);
    }

    /**
     * 사용자의 특정 날짜 운동 기록 조회
     */
    @Transactional(readOnly = true)
    public List<WorkoutRecord> getUserWorkoutRecordsByDate(Long userId, LocalDate workoutDate) {
        return workoutRecordRepository.findByUserIdAndWorkoutDateOrderByCreatedAtDesc(userId, workoutDate);
    }

    /**
     * 운동 기록 수정
     */
    public WorkoutRecord updateWorkoutRecord(Long recordId, WorkoutRecord updatedRecord) {
        WorkoutRecord existingRecord = workoutRecordRepository.findById(recordId)
            .orElseThrow(() -> new RuntimeException("운동 기록을 찾을 수 없습니다."));
        
        // 업데이트할 필드들 설정
        if (updatedRecord.getWorkoutType() != null) {
            existingRecord.setWorkoutType(updatedRecord.getWorkoutType());
        }
        if (updatedRecord.getDuration() != null) {
            existingRecord.setDuration(updatedRecord.getDuration());
        }
        if (updatedRecord.getCalories() != null) {
            existingRecord.setCalories(updatedRecord.getCalories());
        }
        if (updatedRecord.getIntensity() != null) {
            existingRecord.setIntensity(updatedRecord.getIntensity());
        }
        if (updatedRecord.getDifficulty() != null) {
            existingRecord.setDifficulty(updatedRecord.getDifficulty());
        }
        if (updatedRecord.getSets() != null) {
            existingRecord.setSets(updatedRecord.getSets());
        }
        if (updatedRecord.getReps() != null) {
            existingRecord.setReps(updatedRecord.getReps());
        }
        if (updatedRecord.getWeight() != null) {
            existingRecord.setWeight(updatedRecord.getWeight());
        }
        if (updatedRecord.getNotes() != null) {
            existingRecord.setNotes(updatedRecord.getNotes());
        }
        
        return workoutRecordRepository.save(existingRecord);
    }

    /**
     * 운동 기록 삭제
     */
    public void deleteWorkoutRecord(Long recordId) {
        workoutRecordRepository.deleteById(recordId);
    }

    /**
     * 사용자의 월별 운동 통계 조회
     */
    @Transactional(readOnly = true)
    public Object[] getMonthlyWorkoutStats(Long userId, LocalDate startDate, LocalDate endDate) {
        return workoutRecordRepository.getMonthlyWorkoutStats(userId, startDate, endDate);
    }

    /**
     * 사용자의 운동 난이도 분포 조회
     */
    @Transactional(readOnly = true)
    public List<Object[]> getDifficultyDistribution(Long userId, LocalDate startDate, LocalDate endDate) {
        return workoutRecordRepository.getDifficultyDistribution(userId, startDate, endDate);
    }

    /**
     * 사용자의 운동 종류별 통계 조회
     */
    @Transactional(readOnly = true)
    public List<Object[]> getWorkoutTypeStats(Long userId, LocalDate startDate, LocalDate endDate) {
        return workoutRecordRepository.getWorkoutTypeStats(userId, startDate, endDate);
    }

    /**
     * 사용자의 최근 운동 기록 조회 (최근 10개)
     */
    @Transactional(readOnly = true)
    public List<WorkoutRecord> getRecentWorkoutRecords(Long userId) {
        List<WorkoutRecord> records = workoutRecordRepository.findRecentWorkoutsByUserId(userId);
        return records.size() > 10 ? records.subList(0, 10) : records;
    }

    /**
     * 사용자의 주별 운동 통계 조회 (최근 5주)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getWeeklyWorkoutStats(Long userId) {
        return workoutRecordRepository.getWeeklyWorkoutStats(userId);
    }

    /**
     * 사용자의 이번 주 vs 저번 주 운동 시간 비교
     */
    @Transactional(readOnly = true)
    public List<Object[]> getWeeklyComparison(Long userId) {
        return workoutRecordRepository.getWeeklyComparison(userId);
    }

    /**
     * 사용자의 모든 운동 기록 삭제
     */
    public void deleteAllByUserId(Long userId) {
        workoutRecordRepository.deleteByUserId(userId);
    }

    /**
     * 사용자의 운동 기록 개수 조회
     */
    @Transactional(readOnly = true)
    public long countByUserId(Long userId) {
        return workoutRecordRepository.countByUserId(userId);
    }
} 