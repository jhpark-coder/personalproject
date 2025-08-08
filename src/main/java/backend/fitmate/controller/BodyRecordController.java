package backend.fitmate.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.format.annotation.DateTimeFormat;
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

import backend.fitmate.User.entity.BodyRecord;
import backend.fitmate.User.service.BodyRecordService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/body-records")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BodyRecordController {

    private final BodyRecordService bodyRecordService;

    /**
     * 신체 기록 저장
     */
    @PostMapping("/{userId}")
    public ResponseEntity<BodyRecord> saveBodyRecord(
            @PathVariable Long userId,
            @RequestBody BodyRecord bodyRecord) {
        try {
            BodyRecord savedRecord = bodyRecordService.saveBodyRecord(userId, bodyRecord);
            return ResponseEntity.ok(savedRecord);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 모든 신체 기록 조회
     */
    @GetMapping("/{userId}")
    public ResponseEntity<List<BodyRecord>> getUserBodyRecords(@PathVariable Long userId) {
        try {
            List<BodyRecord> records = bodyRecordService.getUserBodyRecords(userId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 특정 기간 신체 기록 조회
     */
    @GetMapping("/{userId}/period")
    public ResponseEntity<List<BodyRecord>> getUserBodyRecordsByPeriod(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            List<BodyRecord> records = bodyRecordService.getUserBodyRecordsByPeriod(userId, startDate, endDate);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 특정 날짜 신체 기록 조회
     */
    @GetMapping("/{userId}/date/{measureDate}")
    public ResponseEntity<BodyRecord> getUserBodyRecordByDate(
            @PathVariable Long userId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate measureDate) {
        try {
            Optional<BodyRecord> record = bodyRecordService.getUserBodyRecordByDate(userId, measureDate);
            return record.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 신체 기록 수정
     */
    @PutMapping("/{recordId}")
    public ResponseEntity<BodyRecord> updateBodyRecord(
            @PathVariable Long recordId,
            @RequestBody BodyRecord updatedRecord) {
        try {
            BodyRecord updated = bodyRecordService.updateBodyRecord(recordId, updatedRecord);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 신체 기록 삭제
     */
    @DeleteMapping("/{recordId}")
    public ResponseEntity<Void> deleteBodyRecord(@PathVariable Long recordId) {
        try {
            bodyRecordService.deleteBodyRecord(recordId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 월별 신체 변화 통계 조회
     */
    @GetMapping("/{userId}/stats/monthly")
    public ResponseEntity<Object[]> getMonthlyBodyStats(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            Object[] stats = bodyRecordService.getMonthlyBodyStats(userId, startDate, endDate);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 체중 변화 추이 조회
     */
    @GetMapping("/{userId}/trends/weight")
    public ResponseEntity<List<Object[]>> getWeightTrend(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            List<Object[]> trend = bodyRecordService.getWeightTrend(userId, startDate, endDate);
            return ResponseEntity.ok(trend);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 체지방률 변화 추이 조회
     */
    @GetMapping("/{userId}/trends/body-fat")
    public ResponseEntity<List<Object[]>> getBodyFatTrend(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            List<Object[]> trend = bodyRecordService.getBodyFatTrend(userId, startDate, endDate);
            return ResponseEntity.ok(trend);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 근육량 변화 추이 조회
     */
    @GetMapping("/{userId}/trends/muscle-mass")
    public ResponseEntity<List<Object[]>> getMuscleMassTrend(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            List<Object[]> trend = bodyRecordService.getMuscleMassTrend(userId, startDate, endDate);
            return ResponseEntity.ok(trend);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 최근 신체 기록 조회
     */
    @GetMapping("/{userId}/recent")
    public ResponseEntity<List<BodyRecord>> getRecentBodyRecords(@PathVariable Long userId) {
        try {
            List<BodyRecord> records = bodyRecordService.getRecentBodyRecords(userId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 체중 변화 추이 조회 (최근 7일 자동)
     */
    @GetMapping("/{userId}/trends/weight/recent")
    public ResponseEntity<List<Object[]>> getRecentWeightTrend(@PathVariable Long userId) {
        try {
            List<Object[]> trend = bodyRecordService.getRecentWeightTrend(userId);
            return ResponseEntity.ok(trend);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 체지방률 변화 추이 조회 (최근 7일 자동)
     */
    @GetMapping("/{userId}/trends/body-fat/recent")
    public ResponseEntity<List<Object[]>> getRecentBodyFatTrend(@PathVariable Long userId) {
        try {
            List<Object[]> trend = bodyRecordService.getRecentBodyFatTrend(userId);
            return ResponseEntity.ok(trend);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자의 근육량 변화 추이 조회 (최근 7일 자동)
     */
    @GetMapping("/{userId}/trends/muscle-mass/recent")
    public ResponseEntity<List<Object[]>> getRecentMuscleMassTrend(@PathVariable Long userId) {
        try {
            List<Object[]> trend = bodyRecordService.getRecentMuscleMassTrend(userId);
            return ResponseEntity.ok(trend);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
} 