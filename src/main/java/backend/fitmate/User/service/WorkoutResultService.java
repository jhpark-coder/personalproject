package backend.fitmate.User.service;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.User.dto.FullSessionFeedbackDto;
import backend.fitmate.User.entity.SessionFeedback;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.WorkoutSession;
import backend.fitmate.User.repository.SessionFeedbackRepository;
import backend.fitmate.User.repository.WorkoutSessionRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WorkoutResultService {

	private final WorkoutSessionRepository workoutSessionRepository;
	private final SessionFeedbackRepository sessionFeedbackRepository;

	@Transactional
	public void saveFullSession(User user, FullSessionFeedbackDto dto) {
		if (user == null || dto == null || dto.getSessionId() == null) {
			throw new IllegalArgumentException("유효하지 않은 세션 피드백 요청입니다.");
		}
		WorkoutSession session = workoutSessionRepository.findById(dto.getSessionId())
				.orElseThrow(() -> new IllegalArgumentException("세션을 찾을 수 없습니다."));
		if (!session.getUser().getId().equals(user.getId())) {
			throw new SecurityException("해당 세션에 대한 권한이 없습니다.");
		}

		SessionFeedback feedback = session.getFeedback();
		if (feedback == null) {
			feedback = SessionFeedback.builder()
					.session(session)
					.build();
		}

		if (dto.getCompletionRate() != null) {
			BigDecimal cr = dto.getCompletionRate();
			if (cr.compareTo(BigDecimal.ZERO) < 0 || cr.compareTo(BigDecimal.ONE) > 0) {
				throw new IllegalArgumentException("completionRate 범위는 0.0~1.0 입니다.");
			}
			feedback.setCompletionRate(cr);
		}
		feedback.setOverallDifficulty(dto.getOverallDifficulty());
		feedback.setSatisfaction(dto.getSatisfaction());
		feedback.setEnergyAfter(dto.getEnergyAfter());
		feedback.setMuscleSoreness(dto.getMuscleSoreness());
		if (dto.getWouldRepeat() != null) {
			feedback.setWouldRepeat(dto.getWouldRepeat());
		}
		feedback.setComments(dto.getComments());

		session.setFeedback(feedback);
		sessionFeedbackRepository.save(feedback);
	}
} 