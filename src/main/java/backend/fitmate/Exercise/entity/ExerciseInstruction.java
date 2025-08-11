package backend.fitmate.Exercise.entity;

import java.time.Instant;

import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "exercise_instructions", indexes = {
        @Index(name = "idx_exercise_instructions_exercise_id", columnList = "exerciseId", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExerciseInstruction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ExerciseDB의 exerciseId 또는 내부 매핑 ID
    @Column(nullable = false, unique = true, length = 64)
    private String exerciseId;

    // 한국어 이름(선택)
    @Column(length = 255)
    private String nameKo;

    // 한국어 동작 지침(JSON 직렬화된 텍스트)
    @Lob
    @Column(columnDefinition = "TEXT")
    private String instructionsKoJson;

    @UpdateTimestamp
    private Instant updatedAt;
} 