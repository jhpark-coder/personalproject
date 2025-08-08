package backend.fitmate.config;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import backend.fitmate.Exercise.entity.Exercise;
import backend.fitmate.Exercise.repository.ExerciseRepository;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class MetsDataLoader implements CommandLineRunner {

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Override
    public void run(String... args) throws Exception {
        log.info("🔍 MET 데이터 로더 시작");
        rebuildExercisesFromSeedCsv();
        log.info("✅ 시드 CSV를 기반으로 운동 테이블 재구성 완료");
    }

    private void rebuildExercisesFromSeedCsv() {
        try {
            ClassPathResource resource = new ClassPathResource("exercises_seed.csv");
            if (!resource.exists()) {
                log.warn("⚠️ 시드 CSV 파일을 찾을 수 없습니다: exercises_seed.csv");
                return;
            }

            List<SeedExercise> seedExercises = new ArrayList<>();

            try (InputStream is = resource.getInputStream();
                 BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                String line;
                boolean firstLine = true;
                while ((line = br.readLine()) != null) {
                    if (firstLine) { // header skip
                        firstLine = false;
                        continue;
                    }
                    if (line.trim().isEmpty()) continue;

                    String[] parts = line.split(",");
                    if (parts.length < 6) {
                        log.warn("⚠️ 잘못된 CSV 라인(컬럼 6개 필요): {}", line);
                        continue;
                    }
                    String name = parts[0].trim();
                    Double mets = null;
                    try { 
                        mets = Double.parseDouble(parts[1].trim());
                        // 소수점 첫째자리로 반올림
                        mets = roundTo1Decimal(mets);
                    } catch (NumberFormatException ignored) {}
                    String targetAreasRaw = parts[2].trim();
                    String primaryMusclesRaw = parts[3].trim();
                    String secondaryMusclesRaw = parts[4].trim();
                    String description = parts[5].trim();

                    List<String> targetAreas = splitMultiValues(targetAreasRaw);
                    List<String> primaryMuscles = splitMultiValues(primaryMusclesRaw);
                    List<String> secondaryMuscles = splitMultiValues(secondaryMusclesRaw);

                    if (name.isEmpty() || mets == null) {
                        log.warn("⚠️ 이름 또는 MET 값이 비어 있음: {}", line);
                        continue;
                    }

                    seedExercises.add(new SeedExercise(name, mets, targetAreas, primaryMuscles, secondaryMuscles, description));
                }
            }

            log.info("🗑️ 기존 운동 데이터 삭제 중...");
            exerciseRepository.deleteAll();

            int created = 0;
            for (SeedExercise s : seedExercises) {
                Exercise ex = new Exercise();
                ex.setName(s.name);
                ex.setKoreanName(s.name);
                ex.setMets(s.mets); // 이미 1자리로 반올림됨
                ex.setIntensity(getIntensityFromMets(s.mets));
                String category = s.targetAreas.isEmpty() ? "전신" : s.targetAreas.get(0);
                ex.setCategory(category);
                ex.setMuscleGroup(category);
                ex.setEquipment(new ArrayList<>());

                // CSV에서 주/보조 근육과 설명 적용
                ex.setMuscles(s.primaryMuscles);
                ex.setMusclesSecondary(s.secondaryMuscles);
                ex.setDescription(s.description.isBlank() ? null : s.description);

                exerciseRepository.save(ex);
                created++;
            }

            log.info("✅ 총 {}개 운동을 시드 CSV에서 생성 완료", created);
        } catch (IOException e) {
            log.error("❌ 시드 CSV 로드 실패: {}", e.getMessage());
        }
    }

    private String getIntensityFromMets(Double mets) {
        if (mets < 3.0) return "LOW";
        if (mets < 6.0) return "MEDIUM";
        return "HIGH";
    }

    private List<String> splitMultiValues(String raw) {
        if (raw == null || raw.isBlank()) return new ArrayList<>();
        return Arrays.stream(raw.split("[;|/|\\|·]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private double roundTo1Decimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record SeedExercise(
            String name,
            Double mets,
            List<String> targetAreas,
            List<String> primaryMuscles,
            List<String> secondaryMuscles,
            String description
    ) {}
} 