package backend.fitmate.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.service.CurrentUserAccessService;
import backend.fitmate.user.entity.WorkoutRecord;
import backend.fitmate.user.service.WorkoutRecordService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/workout-records")
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.frontend.url}", allowCredentials = "true")
public class WorkoutRecordController {

    private final WorkoutRecordService workoutRecordService;
    private final CurrentUserAccessService currentUserAccessService;

    /**
     * 운동 기록 저장
     */
    @PostMapping("/{userId}")
    public ResponseEntity<WorkoutRecord> saveWorkoutRecord(
            @PathVariable Long userId,
            @RequestBody WorkoutRecord workoutRecord) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            WorkoutRecord savedRecord = workoutRecordService.saveWorkoutRecord(userId, workoutRecord);
            return ResponseEntity.ok(savedRecord);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 모든 운동 기록 조회
     */
    @GetMapping("/{userId}")
    public ResponseEntity<List<WorkoutRecord>> getUserWorkoutRecords(@PathVariable Long userId) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            List<WorkoutRecord> records = workoutRecordService.getUserWorkoutRecords(userId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 특정 기간 운동 기록 조회
     */
    @GetMapping("/{userId}/period")
    public ResponseEntity<List<WorkoutRecord>> getUserWorkoutRecordsByPeriod(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            List<WorkoutRecord> records = workoutRecordService.getUserWorkoutRecordsByPeriod(userId, startDate, endDate);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 특정 날짜 운동 기록 조회
     */
    @GetMapping("/{userId}/date/{workoutDate}")
    public ResponseEntity<List<WorkoutRecord>> getUserWorkoutRecordsByDate(
            @PathVariable Long userId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate workoutDate) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            List<WorkoutRecord> records = workoutRecordService.getUserWorkoutRecordsByDate(userId, workoutDate);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 운동 기록 수정
     */
    @PutMapping("/{recordId}")
    public ResponseEntity<WorkoutRecord> updateWorkoutRecord(
            @PathVariable Long recordId,
            @RequestBody WorkoutRecord updatedRecord) {
        Optional<Long> ownerId = workoutRecordService.getWorkoutRecordOwnerId(recordId);
        if (ownerId.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!currentUserAccessService.canAccessUser(ownerId.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            WorkoutRecord updated = workoutRecordService.updateWorkoutRecord(recordId, updatedRecord);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 운동 기록 삭제
     */
    @DeleteMapping("/{recordId}")
    public ResponseEntity<Void> deleteWorkoutRecord(@PathVariable Long recordId) {
        Optional<Long> ownerId = workoutRecordService.getWorkoutRecordOwnerId(recordId);
        if (ownerId.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!currentUserAccessService.canAccessUser(ownerId.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            workoutRecordService.deleteWorkoutRecord(recordId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 월별 운동 통계 조회
     */
    @GetMapping("/{userId}/stats/monthly")
    public ResponseEntity<Object[]> getMonthlyWorkoutStats(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            Object[] stats = workoutRecordService.getMonthlyWorkoutStats(userId, startDate, endDate);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 운동 난이도 분포 조회
     */
    @GetMapping("/{userId}/stats/difficulty")
    public ResponseEntity<List<Object[]>> getDifficultyDistribution(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            List<Object[]> distribution = workoutRecordService.getDifficultyDistribution(userId, startDate, endDate);
            return ResponseEntity.ok(distribution);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 운동 종류별 통계 조회
     */
    @GetMapping("/{userId}/stats/workout-types")
    public ResponseEntity<List<Object[]>> getWorkoutTypeStats(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            List<Object[]> stats = workoutRecordService.getWorkoutTypeStats(userId, startDate, endDate);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 최근 운동 기록 조회
     */
    @GetMapping("/{userId}/recent")
    public ResponseEntity<List<WorkoutRecord>> getRecentWorkoutRecords(@PathVariable Long userId) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            List<WorkoutRecord> records = workoutRecordService.getRecentWorkoutRecords(userId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
