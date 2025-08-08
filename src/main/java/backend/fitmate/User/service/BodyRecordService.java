package backend.fitmate.User.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.User.entity.BodyRecord;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.repository.BodyRecordRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class BodyRecordService {

    private final BodyRecordRepository bodyRecordRepository;
    private final UserService userService;

    /**
     * 신체 기록 저장
     */
    public BodyRecord saveBodyRecord(Long userId, BodyRecord bodyRecord) {
        User user = userService.findById(userId)
            .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        // 체중이 입력된 경우 사용자 프로필의 체중도 업데이트
        if (bodyRecord.getWeight() != null) {
            user.setWeight(String.valueOf(bodyRecord.getWeight()));
            userService.save(user);
        }
        
        bodyRecord.setUser(user);
        return bodyRecordRepository.save(bodyRecord);
    }

    /**
     * 사용자의 모든 신체 기록 조회
     */
    @Transactional(readOnly = true)
    public List<BodyRecord> getUserBodyRecords(Long userId) {
        return bodyRecordRepository.findByUserIdOrderByMeasureDateDesc(userId);
    }

    /**
     * 사용자의 특정 기간 신체 기록 조회
     */
    @Transactional(readOnly = true)
    public List<BodyRecord> getUserBodyRecordsByPeriod(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.findByUserIdAndMeasureDateBetweenOrderByMeasureDateDesc(userId, startDate, endDate);
    }

    /**
     * 사용자의 특정 날짜 신체 기록 조회
     */
    @Transactional(readOnly = true)
    public Optional<BodyRecord> getUserBodyRecordByDate(Long userId, LocalDate measureDate) {
        return bodyRecordRepository.findByUserIdAndMeasureDate(userId, measureDate);
    }

    /**
     * 신체 기록 수정
     */
    public BodyRecord updateBodyRecord(Long recordId, BodyRecord updatedRecord) {
        BodyRecord existingRecord = bodyRecordRepository.findById(recordId)
            .orElseThrow(() -> new RuntimeException("신체 기록을 찾을 수 없습니다."));
        
        // 체중이 업데이트된 경우 사용자 프로필의 체중도 업데이트
        if (updatedRecord.getWeight() != null && !updatedRecord.getWeight().equals(existingRecord.getWeight())) {
            User user = existingRecord.getUser();
            user.setWeight(String.valueOf(updatedRecord.getWeight()));
            userService.save(user);
        }
        
        // 업데이트할 필드들 설정
        if (updatedRecord.getWeight() != null) {
            existingRecord.setWeight(updatedRecord.getWeight());
        }
        if (updatedRecord.getBodyFatPercentage() != null) {
            existingRecord.setBodyFatPercentage(updatedRecord.getBodyFatPercentage());
        }
        if (updatedRecord.getMuscleMass() != null) {
            existingRecord.setMuscleMass(updatedRecord.getMuscleMass());
        }

        if (updatedRecord.getNotes() != null) {
            existingRecord.setNotes(updatedRecord.getNotes());
        }
        
        return bodyRecordRepository.save(existingRecord);
    }

    /**
     * 신체 기록 삭제
     */
    public void deleteBodyRecord(Long recordId) {
        bodyRecordRepository.deleteById(recordId);
    }

    /**
     * 사용자의 모든 신체 기록 삭제
     */
    public void deleteAllByUserId(Long userId) {
        bodyRecordRepository.deleteByUserId(userId);
    }

    /**
     * 사용자의 신체 기록 개수 조회
     */
    @Transactional(readOnly = true)
    public long countByUserId(Long userId) {
        return bodyRecordRepository.countByUserId(userId);
    }

    /**
     * 사용자의 월별 신체 변화 통계 조회
     */
    @Transactional(readOnly = true)
    public Object[] getMonthlyBodyStats(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getMonthlyBodyStats(userId, startDate, endDate);
    }

    /**
     * 사용자의 체중 변화 추이 조회 (일별)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getWeightTrend(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getWeightTrend(userId, startDate, endDate);
    }

    /**
     * 사용자의 체지방률 변화 추이 조회 (일별)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getBodyFatTrend(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getBodyFatTrend(userId, startDate, endDate);
    }

    /**
     * 사용자의 근육량 변화 추이 조회 (일별)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getMuscleMassTrend(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getMuscleMassTrend(userId, startDate, endDate);
    }

    /**
     * 사용자의 체중 변화 추이 조회 (주별)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getWeightTrendWeekly(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getWeightTrendWeekly(userId, startDate, endDate);
    }

    /**
     * 사용자의 체지방률 변화 추이 조회 (주별)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getBodyFatTrendWeekly(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getBodyFatTrendWeekly(userId, startDate, endDate);
    }

    /**
     * 사용자의 근육량 변화 추이 조회 (주별)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getMuscleMassTrendWeekly(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getMuscleMassTrendWeekly(userId, startDate, endDate);
    }

    /**
     * 사용자의 체중 변화 추이 조회 (월별)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getWeightTrendMonthly(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getWeightTrendMonthly(userId, startDate, endDate);
    }

    /**
     * 사용자의 체지방률 변화 추이 조회 (월별)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getBodyFatTrendMonthly(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getBodyFatTrendMonthly(userId, startDate, endDate);
    }

    /**
     * 사용자의 근육량 변화 추이 조회 (월별)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getMuscleMassTrendMonthly(Long userId, LocalDate startDate, LocalDate endDate) {
        return bodyRecordRepository.getMuscleMassTrendMonthly(userId, startDate, endDate);
    }

    /**
     * 사용자의 최근 신체 기록 조회 (최근 5개)
     */
    @Transactional(readOnly = true)
    public List<BodyRecord> getRecentBodyRecords(Long userId) {
        List<BodyRecord> records = bodyRecordRepository.findRecentBodyRecordsByUserId(userId);
        return records.size() > 5 ? records.subList(0, 5) : records;
    }

    /**
     * 사용자의 체중 변화 추이 조회 (최근 7일 자동 계산)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getRecentWeightTrend(Long userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(6); // 7일 간격
        return bodyRecordRepository.getWeightTrend(userId, startDate, endDate);
    }

    /**
     * 사용자의 체지방률 변화 추이 조회 (최근 7일 자동 계산)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getRecentBodyFatTrend(Long userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(6); // 7일 간격
        return bodyRecordRepository.getBodyFatTrend(userId, startDate, endDate);
    }

    /**
     * 사용자의 근육량 변화 추이 조회 (최근 7일 자동 계산)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getRecentMuscleMassTrend(Long userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(6); // 7일 간격
        return bodyRecordRepository.getMuscleMassTrend(userId, startDate, endDate);
    }

    /**
     * 사용자의 체중 변화 추이 조회 (최근 4주 자동 계산)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getRecentWeightTrendWeekly(Long userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusWeeks(4);
        return bodyRecordRepository.getWeightTrendWeekly(userId, startDate, endDate);
    }

    /**
     * 사용자의 체지방률 변화 추이 조회 (최근 4주 자동 계산)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getRecentBodyFatTrendWeekly(Long userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusWeeks(4);
        return bodyRecordRepository.getBodyFatTrendWeekly(userId, startDate, endDate);
    }

    /**
     * 사용자의 근육량 변화 추이 조회 (최근 4주 자동 계산)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getRecentMuscleMassTrendWeekly(Long userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusWeeks(4);
        return bodyRecordRepository.getMuscleMassTrendWeekly(userId, startDate, endDate);
    }

    /**
     * 사용자의 체중 변화 추이 조회 (최근 3개월 자동 계산)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getRecentWeightTrendMonthly(Long userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(3);
        return bodyRecordRepository.getWeightTrendMonthly(userId, startDate, endDate);
    }

    /**
     * 사용자의 체지방률 변화 추이 조회 (최근 3개월 자동 계산)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getRecentBodyFatTrendMonthly(Long userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(3);
        return bodyRecordRepository.getBodyFatTrendMonthly(userId, startDate, endDate);
    }

    /**
     * 사용자의 근육량 변화 추이 조회 (최근 3개월 자동 계산)
     */
    @Transactional(readOnly = true)
    public List<Object[]> getRecentMuscleMassTrendMonthly(Long userId) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(3);
        return bodyRecordRepository.getMuscleMassTrendMonthly(userId, startDate, endDate);
    }
} 