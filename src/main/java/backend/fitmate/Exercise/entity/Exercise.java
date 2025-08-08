package backend.fitmate.Exercise.entity;

import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String koreanName; // 한국어 운동명

    @Column(length = 2000) // 설명이 길 수 있으므로 길이를 늘림
    private String description;

    private String category;

    private String muscleGroup; // 주요 근육군

    @ElementCollection
    @CollectionTable(name = "exercise_equipment", joinColumns = @JoinColumn(name = "exercise_id"))
    @Column(name = "equipment")
    private List<String> equipment;

    @ElementCollection
    @CollectionTable(name = "exercise_muscles", joinColumns = @JoinColumn(name = "exercise_id"))
    @Column(name = "muscle")
    private List<String> muscles;

    @ElementCollection
    @CollectionTable(name = "exercise_muscles_secondary", joinColumns = @JoinColumn(name = "exercise_id"))
    @Column(name = "muscle_secondary")
    private List<String> musclesSecondary;

    // MET 관련 정보
    private Double mets; // MET 값 (Metabolic Equivalent of Task)
    private String intensity; // 운동 강도 (LOW, MEDIUM, HIGH)
} 