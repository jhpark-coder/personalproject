package backend.fitmate.User.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workout_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class WorkoutRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;
    
    @Column(nullable = false)
    private LocalDate workoutDate; // 운동 날짜
    
    @Column(nullable = false)
    private String workoutType; // 운동 종류 (웨이트, 유산소, 요가 등)
    
    @Column
    private Integer duration; // 운동 시간 (분)
    
    @Column
    private Integer calories; // 소모 칼로리
    
    @Column
    private Integer intensity; // 운동 강도 (1-10)
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkoutDifficulty difficulty; // 사용자가 느낀 난이도
    
    @Column
    private Integer sets; // 세트 수 (웨이트 운동)
    
    @Column
    private Integer reps; // 횟수 (웨이트 운동)
    
    @Column
    private Double weight; // 무게 (kg, 웨이트 운동)
    
    @Column
    private String notes; // 메모
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    // 운동 난이도 enum
    public enum WorkoutDifficulty {
        VERY_EASY("매우 쉬움"),
        EASY("쉬움"),
        MODERATE("보통"),
        HARD("어려움"),
        VERY_HARD("매우 어려움");
        
        private final String description;
        
        WorkoutDifficulty(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
} 