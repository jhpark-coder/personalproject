package backend.fitmate.User.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 운동 세션 기록 - 사용자의 한 번의 완전한 운동 세션을 나타냄
 */
@Entity
@Table(name = "workout_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class WorkoutSession {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;
    
    @Column(nullable = false, length = 50)
    private String goal; // 운동 목표: diet, strength, body, fitness, stamina
    
    @Column(length = 100)
    private String exerciseType; // 통합 운동 세션의 주요 운동 타입
    
    @Column
    private Integer plannedDuration; // 계획된 시간(분)
    
    @Column
    private Integer actualDuration; // 실제 소요 시간(분)
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime sessionDate;
    
    // 개별 운동 실행 기록들
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ExerciseExecution> exerciseExecutions = new ArrayList<>();
    
    // 세션 전체 피드백 (1:1 관계)
    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private SessionFeedback feedback;
    
    // 연관관계 편의 메서드
    public void addExerciseExecution(ExerciseExecution execution) {
        exerciseExecutions.add(execution);
        execution.setSession(this);
    }
    
    public void setSessionFeedback(SessionFeedback feedback) {
        this.feedback = feedback;
        if (feedback != null) {
            feedback.setSession(this);
        }
    }
}