package backend.fitmate.domain.exercise.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.domain.exercise.entity.Exercise;
import backend.fitmate.domain.exercise.repository.ExerciseRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExerciseService {
    private final ExerciseRepository exerciseRepository;
    // Wger 연동 제거로 인해 더 이상 사용하지 않음
    // private final WgerApiService wgerApiService;

    // Wger에서 받아 저장하던 로직 제거
    // @Transactional
    // public void saveAllExercisesFromWger(List<Map<String, Object>> wgerExercises) { /* removed */ }

    // MET 정보 설정 메서드
    private void setMetsInfo(Exercise exercise, Map<String, Object> exerciseDetail) {
        String category = exercise.getCategory();
        String exerciseName = exercise.getName();
        
        // 기본 MET 값 설정 (운동 종류별)
        if (category != null) {
            category = category.toLowerCase();
            
            // 유산소 운동
            if (category.contains("cardio") || category.contains("running") || category.contains("cycling")) {
                exercise.setMets(8.0);
                exercise.setIntensity("HIGH");
            }
            // 근력 운동
            else if (category.contains("strength") || category.contains("weightlifting") || category.contains("bodybuilding")) {
                exercise.setMets(6.0);
                exercise.setIntensity("MEDIUM");
            }
            // 요가/스트레칭
            else if (category.contains("yoga") || category.contains("stretching") || category.contains("flexibility")) {
                exercise.setMets(2.5);
                exercise.setIntensity("LOW");
            }
            // 복합 운동
            else if (category.contains("compound") || category.contains("functional") || category.contains("crossfit")) {
                exercise.setMets(10.0);
                exercise.setIntensity("HIGH");
            }
            // 맨몸 운동
            else if (category.contains("bodyweight") || category.contains("calisthenics")) {
                exercise.setMets(5.0);
                exercise.setIntensity("MEDIUM");
            }
            // 기본값
            else {
                exercise.setMets(4.0);
                exercise.setIntensity("MEDIUM");
            }
        } else {
            // 카테고리가 없는 경우 운동 이름으로 판단
            if (exerciseName != null) {
                exerciseName = exerciseName.toLowerCase();
                
                if (exerciseName.contains("squat") || exerciseName.contains("deadlift") || exerciseName.contains("bench")) {
                    exercise.setMets(7.0);
                    exercise.setIntensity("HIGH");
                } else if (exerciseName.contains("push-up") || exerciseName.contains("pull-up")) {
                    exercise.setMets(6.0);
                    exercise.setIntensity("MEDIUM");
                } else {
                    exercise.setMets(4.0);
                    exercise.setIntensity("MEDIUM");
                }
            } else {
                exercise.setMets(4.0);
                exercise.setIntensity("MEDIUM");
            }
        }
        
        System.out.println("✅ MET 정보 설정: " + exercise.getMets() + " MET, 강도: " + exercise.getIntensity());
    }

    // translations 배열에서 한국어 운동명 가져오기
    private String getExerciseNameFromTranslations(Map<String, Object> wgerExercise) {
        if (!wgerExercise.containsKey("translations")) {
            return null;
        }
        
        List<Map<String, Object>> translations = getList(wgerExercise.get("translations"));
        if (translations == null) {
            return null;
        }
        
        // 한국어 번역을 우선적으로 찾기 (language=7)
        for (Map<String, Object> translation : translations) {
            Integer language = getIntegerValue(translation.get("language"));
            if (language != null && language == 7) {
                String name = getStringValue(translation.get("name"));
                if (name != null && !name.trim().isEmpty()) {
                    return name;
                }
            }
        }
        
        // 한국어 번역이 없으면 영어 번역 찾기 (language=2)
        for (Map<String, Object> translation : translations) {
            Integer language = getIntegerValue(translation.get("language"));
            if (language != null && language == 2) {
                String name = getStringValue(translation.get("name"));
                if (name != null && !name.trim().isEmpty()) {
                    // 영어 이름을 한국어로 번역
                    return translateExerciseName(name);
                }
            }
        }
        
        return null;
    }

    // 영어 운동명을 한국어로 번역
    private String translateExerciseName(String englishName) {
        if (englishName == null) return null;
        
        Map<String, String> exerciseTranslations = new HashMap<>();
        
        // === 상체 운동 ===
        // 가슴 운동
        exerciseTranslations.put("Barbell Bench Press", "바벨 벤치프레스");
        exerciseTranslations.put("Dumbbell Bench Press", "덤벨 벤치프레스");
        exerciseTranslations.put("Incline Barbell Bench Press", "인클라인 바벨 벤치프레스");
        exerciseTranslations.put("Incline Dumbbell Bench Press", "인클라인 덤벨 벤치프레스");
        exerciseTranslations.put("Decline Barbell Bench Press", "디클라인 바벨 벤치프레스");
        exerciseTranslations.put("Decline Dumbbell Bench Press", "디클라인 덤벨 벤치프레스");
        exerciseTranslations.put("Dumbbell Fly", "덤벨 플라이");
        exerciseTranslations.put("Cable Crossover", "케이블 크로스오버");
        exerciseTranslations.put("Push-up", "푸시업");
        exerciseTranslations.put("Diamond Push-up", "다이아몬드 푸시업");
        exerciseTranslations.put("Wide Push-up", "와이드 푸시업");
        exerciseTranslations.put("Decline Push-up", "디클라인 푸시업");
        exerciseTranslations.put("Incline Push-up", "인클라인 푸시업");
        exerciseTranslations.put("Dips", "딥스");
        exerciseTranslations.put("Chest Dip", "체스트 딥스");
        
        // 등 운동
        exerciseTranslations.put("Barbell Deadlift", "바벨 데드리프트");
        exerciseTranslations.put("Dumbbell Deadlift", "덤벨 데드리프트");
        exerciseTranslations.put("Romanian Deadlift", "루마니안 데드리프트");
        exerciseTranslations.put("Sumo Deadlift", "스모 데드리프트");
        exerciseTranslations.put("Barbell Row", "바벨 로우");
        exerciseTranslations.put("Dumbbell Row", "덤벨 로우");
        exerciseTranslations.put("T-Bar Row", "티바 로우");
        exerciseTranslations.put("Cable Row", "케이블 로우");
        exerciseTranslations.put("Pull-up", "턱걸이");
        exerciseTranslations.put("Chin-up", "친업");
        exerciseTranslations.put("Lat Pulldown", "랫 풀다운");
        exerciseTranslations.put("Seated Cable Row", "시티드 케이블 로우");
        exerciseTranslations.put("Bent Over Row", "벤트 오버 로우");
        exerciseTranslations.put("Single Arm Dumbbell Row", "원암 덤벨 로우");
        
        // 어깨 운동
        exerciseTranslations.put("Barbell Overhead Press", "바벨 오버헤드 프레스");
        exerciseTranslations.put("Dumbbell Shoulder Press", "덤벨 숄더 프레스");
        exerciseTranslations.put("Military Press", "밀리터리 프레스");
        exerciseTranslations.put("Arnold Press", "아놀드 프레스");
        exerciseTranslations.put("Lateral Raise", "레터럴 레이즈");
        exerciseTranslations.put("Front Raise", "프론트 레이즈");
        exerciseTranslations.put("Rear Delt Fly", "리어 델트 플라이");
        exerciseTranslations.put("Upright Row", "업라이트 로우");
        exerciseTranslations.put("Shrug", "슈러그");
        exerciseTranslations.put("Face Pull", "페이스 풀");
        
        // 팔 운동
        exerciseTranslations.put("Barbell Curl", "바벨 컬");
        exerciseTranslations.put("Dumbbell Curl", "덤벨 컬");
        exerciseTranslations.put("Hammer Curl", "해머 컬");
        exerciseTranslations.put("Preacher Curl", "프리처 컬");
        exerciseTranslations.put("Concentration Curl", "컨센트레이션 컬");
        exerciseTranslations.put("Incline Dumbbell Curl", "인클라인 덤벨 컬");
        exerciseTranslations.put("Cable Curl", "케이블 컬");
        exerciseTranslations.put("Barbell Tricep Extension", "바벨 트라이셉 익스텐션");
        exerciseTranslations.put("Dumbbell Tricep Extension", "덤벨 트라이셉 익스텐션");
        exerciseTranslations.put("Skull Crusher", "스컬 크러셔");
        exerciseTranslations.put("Tricep Dip", "트라이셉 딥스");
        exerciseTranslations.put("Cable Tricep Extension", "케이블 트라이셉 익스텐션");
        exerciseTranslations.put("Overhead Tricep Extension", "오버헤드 트라이셉 익스텐션");
        exerciseTranslations.put("Close Grip Bench Press", "클로즈 그립 벤치프레스");
        
        // === 하체 운동 ===
        // 스쿼트
        exerciseTranslations.put("Barbell Back Squat", "바벨 백 스쿼트");
        exerciseTranslations.put("Front Squat", "프론트 스쿼트");
        exerciseTranslations.put("Dumbbell Squat", "덤벨 스쿼트");
        exerciseTranslations.put("Goblet Squat", "고블릿 스쿼트");
        exerciseTranslations.put("Box Squat", "박스 스쿼트");
        exerciseTranslations.put("Pistol Squat", "피스톨 스쿼트");
        exerciseTranslations.put("Jump Squat", "점프 스쿼트");
        exerciseTranslations.put("Wall Sit", "벽 스쿼트");
        exerciseTranslations.put("Bodyweight Squat", "맨몸 스쿼트");
        exerciseTranslations.put("Hack Squat", "핵 스쿼트");
        exerciseTranslations.put("Leg Press", "레그 프레스");
        
        // 런지
        exerciseTranslations.put("Walking Lunge", "워킹 런지");
        exerciseTranslations.put("Dumbbell Lunge", "덤벨 런지");
        exerciseTranslations.put("Barbell Lunge", "바벨 런지");
        exerciseTranslations.put("Reverse Lunge", "리버스 런지");
        exerciseTranslations.put("Side Lunge", "사이드 런지");
        exerciseTranslations.put("Bulgarian Split Squat", "불가리안 스플릿 스쿼트");
        
        // 데드리프트 변형
        exerciseTranslations.put("Stiff Leg Deadlift", "스티프 레그 데드리프트");
        exerciseTranslations.put("Single Leg Deadlift", "싱글 레그 데드리프트");
        exerciseTranslations.put("Trap Bar Deadlift", "트랩바 데드리프트");
        
        // 기타 하체
        exerciseTranslations.put("Leg Extension", "레그 익스텐션");
        exerciseTranslations.put("Leg Curl", "레그 컬");
        exerciseTranslations.put("Standing Calf Raise", "스탠딩 캘프 레이즈");
        exerciseTranslations.put("Seated Calf Raise", "시티드 캘프 레이즈");
        exerciseTranslations.put("Donkey Calf Raise", "동키 캘프 레이즈");
        exerciseTranslations.put("Hip Thrust", "힙 쓰러스트");
        exerciseTranslations.put("Glute Bridge", "글루트 브릿지");
        exerciseTranslations.put("Step Up", "스텝업");
        exerciseTranslations.put("Good Morning", "굿모닝");
        
        // === 복근 운동 ===
        exerciseTranslations.put("Crunch", "크런치");
        exerciseTranslations.put("Sit-up", "윗몸일으키기");
        exerciseTranslations.put("Plank", "플랭크");
        exerciseTranslations.put("Side Plank", "사이드 플랭크");
        exerciseTranslations.put("Russian Twist", "러시안 트위스트");
        exerciseTranslations.put("Bicycle Crunch", "바이시클 크런치");
        exerciseTranslations.put("Leg Raise", "레그 레이즈");
        exerciseTranslations.put("Hanging Leg Raise", "행잉 레그 레이즈");
        exerciseTranslations.put("Mountain Climber", "마운틴 클라이머");
        exerciseTranslations.put("Ab Wheel Rollout", "앱 휠 롤아웃");
        exerciseTranslations.put("Cable Woodchop", "케이블 우드챕");
        exerciseTranslations.put("Dead Bug", "데드 버그");
        exerciseTranslations.put("Bird Dog", "버드 독");
        
        // === 복합 운동 ===
        exerciseTranslations.put("Burpee", "버피");
        exerciseTranslations.put("Thruster", "쓰러스터");
        exerciseTranslations.put("Man Maker", "맨 메이커");
        exerciseTranslations.put("Turkish Get-up", "터키시 겟업");
        exerciseTranslations.put("Clean and Press", "클린 앤 프레스");
        exerciseTranslations.put("Snatch", "스내치");
        exerciseTranslations.put("Kettlebell Swing", "케틀벨 스윙");
        exerciseTranslations.put("Kettlebell Clean", "케틀벨 클린");
        exerciseTranslations.put("Kettlebell Snatch", "케틀벨 스내치");
        
        // === 유산소 운동 ===
        exerciseTranslations.put("Running", "러닝");
        exerciseTranslations.put("Cycling", "사이클링");
        exerciseTranslations.put("Rowing", "로잉");
        exerciseTranslations.put("Elliptical", "엘립티컬");
        exerciseTranslations.put("Stairmaster", "스테어마스터");
        exerciseTranslations.put("Jumping Jack", "점핑잭");
        exerciseTranslations.put("High Knees", "하이 니즈");
        exerciseTranslations.put("Butt Kicks", "벗 킥스");
        exerciseTranslations.put("Mountain Climber", "마운틴 클라이머");
        exerciseTranslations.put("Burpee", "버피");
        
        // === 스트레칭 ===
        exerciseTranslations.put("Cobra Stretch", "코브라 스트레치");
        exerciseTranslations.put("Cat Cow Stretch", "캣 카우 스트레치");
        exerciseTranslations.put("Child's Pose", "차일드 포즈");
        exerciseTranslations.put("Downward Dog", "다운워드 독");
        exerciseTranslations.put("Pigeon Pose", "피전 포즈");
        exerciseTranslations.put("Butterfly Stretch", "버터플라이 스트레치");
        exerciseTranslations.put("Hamstring Stretch", "햄스트링 스트레치");
        exerciseTranslations.put("Quad Stretch", "쿼드 스트레치");
        exerciseTranslations.put("Calf Stretch", "캘프 스트레치");
        exerciseTranslations.put("Hip Flexor Stretch", "힙 플렉서 스트레치");
        
        // === 기타 인기 운동 ===
        exerciseTranslations.put("Bear Walk", "곰 걸음");
        exerciseTranslations.put("Crab Walk", "게 걸음");
        exerciseTranslations.put("Duck Walk", "오리 걸음");
        exerciseTranslations.put("Inchworm", "인치웜");
        exerciseTranslations.put("Spider-Man", "스파이더맨");
        exerciseTranslations.put("Superman", "슈퍼맨");
        exerciseTranslations.put("Bird Dog", "버드 독");
        exerciseTranslations.put("Dead Bug", "데드 버그");
        exerciseTranslations.put("Plank to Downward Dog", "플랭크 투 다운워드 독");
        exerciseTranslations.put("Plank with Leg Lift", "레그 리프트 플랭크");
        exerciseTranslations.put("Side Plank with Hip Dip", "힙 딥 사이드 플랭크");
        exerciseTranslations.put("Reverse Plank", "리버스 플랭크");
        exerciseTranslations.put("Plank Jack", "플랭크 잭");
        exerciseTranslations.put("Plank to Pike", "플랭크 투 파이크");
        
        // === 기구별 운동 ===
        exerciseTranslations.put("Cable Crossover", "케이블 크로스오버");
        exerciseTranslations.put("Cable Fly", "케이블 플라이");
        exerciseTranslations.put("Cable Row", "케이블 로우");
        exerciseTranslations.put("Cable Pulldown", "케이블 풀다운");
        exerciseTranslations.put("Cable Curl", "케이블 컬");
        exerciseTranslations.put("Cable Tricep Extension", "케이블 트라이셉 익스텐션");
        exerciseTranslations.put("Cable Woodchop", "케이블 우드챕");
        exerciseTranslations.put("Cable Rotation", "케이블 로테이션");
        
        // === 스페인어/기타 언어 번역 ===
        exerciseTranslations.put("Sentadilla", "스쿼트");
        exerciseTranslations.put("Flexión de brazos", "푸시업");
        exerciseTranslations.put("Dominadas", "턱걸이");
        exerciseTranslations.put("Plancha", "플랭크");
        exerciseTranslations.put("Burpee", "버피");
        exerciseTranslations.put("Zancada", "런지");
        exerciseTranslations.put("Peso muerto", "데드리프트");
        exerciseTranslations.put("Press de banca", "벤치프레스");
        exerciseTranslations.put("Press militar", "밀리터리 프레스");
        exerciseTranslations.put("Curl de bíceps", "바이셉 컬");
        exerciseTranslations.put("Extensión de tríceps", "트라이셉 익스텐션");
        exerciseTranslations.put("Elevación lateral", "레터럴 레이즈");
        exerciseTranslations.put("Remo", "로우");
        exerciseTranslations.put("Peso muerto rumano", "루마니안 데드리프트");
        exerciseTranslations.put("Sentadilla frontal", "프론트 스쿼트");
        exerciseTranslations.put("Sentadilla con mancuernas", "덤벨 스쿼트");
        exerciseTranslations.put("Sentadilla goblet", "고블릿 스쿼트");
        exerciseTranslations.put("Zancada con mancuernas", "덤벨 런지");
        exerciseTranslations.put("Puente de glúteos", "글루트 브릿지");
        exerciseTranslations.put("Empuje de cadera", "힙 쓰러스트");
        exerciseTranslations.put("Crunch", "크런치");
        exerciseTranslations.put("Abdominales", "윗몸일으키기");
        exerciseTranslations.put("Plancha lateral", "사이드 플랭크");
        exerciseTranslations.put("Giro ruso", "러시안 트위스트");
        exerciseTranslations.put("Crunch en bicicleta", "바이시클 크런치");
        exerciseTranslations.put("Elevación de piernas", "레그 레이즈");
        exerciseTranslations.put("Escalador", "마운틴 클라이머");
        exerciseTranslations.put("Jumping Jack", "점핑잭");
        exerciseTranslations.put("Rodillas altas", "하이 니즈");
        exerciseTranslations.put("Patadas al trasero", "벗 킥스");
        
        // === 독일어 번역 ===
        exerciseTranslations.put("Kniebeugen", "스쿼트");
        exerciseTranslations.put("Liegestütze", "푸시업");
        exerciseTranslations.put("Klimmzüge", "턱걸이");
        exerciseTranslations.put("Unterarmstütz", "플랭크");
        exerciseTranslations.put("Burpee", "버피");
        exerciseTranslations.put("Ausfallschritt", "런지");
        exerciseTranslations.put("Kreuzheben", "데드리프트");
        exerciseTranslations.put("Bankdrücken", "벤치프레스");
        exerciseTranslations.put("Schulterdrücken", "밀리터리 프레스");
        exerciseTranslations.put("Bizeps-Curl", "바이셉 컬");
        exerciseTranslations.put("Trizeps-Extension", "트라이셉 익스텐션");
        exerciseTranslations.put("Seitheben", "레터럴 레이즈");
        exerciseTranslations.put("Rudern", "로우");
        exerciseTranslations.put("Rumänisches Kreuzheben", "루마니안 데드리프트");
        exerciseTranslations.put("Frontkniebeugen", "프론트 스쿼트");
        exerciseTranslations.put("Kurzhantel-Kniebeugen", "덤벨 스쿼트");
        exerciseTranslations.put("Goblet-Kniebeugen", "고블릿 스쿼트");
        exerciseTranslations.put("Kurzhantel-Ausfallschritt", "덤벨 런지");
        exerciseTranslations.put("Gesäßbrücke", "글루트 브릿지");
        exerciseTranslations.put("Hüftstoß", "힙 쓰러스트");
        exerciseTranslations.put("Crunch", "크런치");
        exerciseTranslations.put("Sit-ups", "윗몸일으키기");
        exerciseTranslations.put("Seitstütz", "사이드 플랭크");
        exerciseTranslations.put("Russische Drehung", "러시안 트위스트");
        exerciseTranslations.put("Fahrrad-Crunch", "바이시클 크런치");
        exerciseTranslations.put("Beinheben", "레그 레이즈");
        exerciseTranslations.put("Bergsteiger", "마운틴 클라이머");
        exerciseTranslations.put("Hampelmann", "점핑잭");
        exerciseTranslations.put("Hohe Knie", "하이 니즈");
        exerciseTranslations.put("Fersen-Kicks", "벗 킥스");
        
        // === 프랑스어 번역 ===
        exerciseTranslations.put("Squat", "스쿼트");
        exerciseTranslations.put("Pompes", "푸시업");
        exerciseTranslations.put("Tractions", "턱걸이");
        exerciseTranslations.put("Planche", "플랭크");
        exerciseTranslations.put("Burpee", "버피");
        exerciseTranslations.put("Fente", "런지");
        exerciseTranslations.put("Soulevé de terre", "데드리프트");
        exerciseTranslations.put("Développé couché", "벤치프레스");
        exerciseTranslations.put("Développé militaire", "밀리터리 프레스");
        exerciseTranslations.put("Curl biceps", "바이셉 컬");
        exerciseTranslations.put("Extension triceps", "트라이셉 익스텐션");
        exerciseTranslations.put("Élévation latérale", "레터럴 레이즈");
        exerciseTranslations.put("Rowing", "로우");
        exerciseTranslations.put("Soulevé de terre roumain", "루마니안 데드리프트");
        exerciseTranslations.put("Squat avant", "프론트 스쿼트");
        exerciseTranslations.put("Squat haltères", "덤벨 스쿼트");
        exerciseTranslations.put("Squat goblet", "고블릿 스쿼트");
        exerciseTranslations.put("Fente haltères", "덤벨 런지");
        exerciseTranslations.put("Pont fessier", "글루트 브릿지");
        exerciseTranslations.put("Hip thrust", "힙 쓰러스트");
        exerciseTranslations.put("Crunch", "크런치");
        exerciseTranslations.put("Relevé de buste", "윗몸일으키기");
        exerciseTranslations.put("Planche latérale", "사이드 플랭크");
        exerciseTranslations.put("Rotation russe", "러시안 트위스트");
        exerciseTranslations.put("Crunch vélo", "바이시클 크런치");
        exerciseTranslations.put("Relevé de jambes", "레그 레이즈");
        exerciseTranslations.put("Grimpeur", "마운틴 클라이머");
        exerciseTranslations.put("Jumping jack", "점핑잭");
        exerciseTranslations.put("Genoux hauts", "하이 니즈");
        exerciseTranslations.put("Talons aux fesses", "벗 킥스");
        
        // === 이탈리아어 번역 ===
        exerciseTranslations.put("Squat", "스쿼트");
        exerciseTranslations.put("Flessioni", "푸시업");
        exerciseTranslations.put("Trazioni", "턱걸이");
        exerciseTranslations.put("Plank", "플랭크");
        exerciseTranslations.put("Burpee", "버피");
        exerciseTranslations.put("Affondi", "런지");
        exerciseTranslations.put("Stacco da terra", "데드리프트");
        exerciseTranslations.put("Panca piana", "벤치프레스");
        exerciseTranslations.put("Lento militare", "밀리터리 프레스");
        exerciseTranslations.put("Curl bicipiti", "바이셉 컬");
        exerciseTranslations.put("Estensioni tricipiti", "트라이셉 익스텐션");
        exerciseTranslations.put("Alzate laterali", "레터럴 레이즈");
        exerciseTranslations.put("Rematore", "로우");
        exerciseTranslations.put("Stacco da terra rumeno", "루마니안 데드리프트");
        exerciseTranslations.put("Squat frontale", "프론트 스쿼트");
        exerciseTranslations.put("Squat con manubri", "덤벨 스쿼트");
        exerciseTranslations.put("Squat goblet", "고블릿 스쿼트");
        exerciseTranslations.put("Affondi con manubri", "덤벨 런지");
        exerciseTranslations.put("Ponte glutei", "글루트 브릿지");
        exerciseTranslations.put("Hip thrust", "힙 쓰러스트");
        exerciseTranslations.put("Crunch", "크런치");
        exerciseTranslations.put("Addominali", "윗몸일으키기");
        exerciseTranslations.put("Plank laterale", "사이드 플랭크");
        exerciseTranslations.put("Rotazione russa", "러시안 트위스트");
        exerciseTranslations.put("Crunch bicicletta", "바이시클 크런치");
        exerciseTranslations.put("Alzate gambe", "레그 레이즈");
        exerciseTranslations.put("Scalatore", "마운틴 클라이머");
        exerciseTranslations.put("Jumping jack", "점핑잭");
        exerciseTranslations.put("Ginocchia alte", "하이 니즈");
        exerciseTranslations.put("Calci al sedere", "벗 킥스");
        
        // === 포르투갈어 번역 ===
        exerciseTranslations.put("Agachamento", "스쿼트");
        exerciseTranslations.put("Flexão de braços", "푸시업");
        exerciseTranslations.put("Barra fixa", "턱걸이");
        exerciseTranslations.put("Prancha", "플랭크");
        exerciseTranslations.put("Burpee", "버피");
        exerciseTranslations.put("Afundo", "런지");
        exerciseTranslations.put("Levantamento terra", "데드리프트");
        exerciseTranslations.put("Supino reto", "벤치프레스");
        exerciseTranslations.put("Desenvolvimento militar", "밀리터리 프레스");
        exerciseTranslations.put("Rosca bíceps", "바이셉 컬");
        exerciseTranslations.put("Extensão tríceps", "트라이셉 익스텐션");
        exerciseTranslations.put("Elevação lateral", "레터럴 레이즈");
        exerciseTranslations.put("Remada", "로우");
        exerciseTranslations.put("Levantamento terra romeno", "루마니안 데드리프트");
        exerciseTranslations.put("Agachamento frontal", "프론트 스쿼트");
        exerciseTranslations.put("Agachamento com halteres", "덤벨 스쿼트");
        exerciseTranslations.put("Agachamento goblet", "고블릿 스쿼트");
        exerciseTranslations.put("Afundo com halteres", "덤벨 런지");
        exerciseTranslations.put("Ponte de glúteos", "글루트 브릿지");
        exerciseTranslations.put("Hip thrust", "힙 쓰러스트");
        exerciseTranslations.put("Abdominal", "크런치");
        exerciseTranslations.put("Abdominal completo", "윗몸일으키기");
        exerciseTranslations.put("Prancha lateral", "사이드 플랭크");
        exerciseTranslations.put("Rotação russa", "러시안 트위스트");
        exerciseTranslations.put("Abdominal bicicleta", "바이시클 크런치");
        exerciseTranslations.put("Elevação de pernas", "레그 레이즈");
        exerciseTranslations.put("Escalador", "마운틴 클라이머");
        exerciseTranslations.put("Polichinelo", "점핑잭");
        exerciseTranslations.put("Joelhos altos", "하이 니즈");
        exerciseTranslations.put("Chutes no bumbum", "벗 킥스");
        
        // === 러시아어 번역 ===
        exerciseTranslations.put("Приседания", "스쿼트");
        exerciseTranslations.put("Отжимания", "푸시업");
        exerciseTranslations.put("Подтягивания", "턱걸이");
        exerciseTranslations.put("Планка", "플랭크");
        exerciseTranslations.put("Берпи", "버피");
        exerciseTranslations.put("Выпады", "런지");
        exerciseTranslations.put("Становая тяга", "데드리프트");
        exerciseTranslations.put("Жим лежа", "벤치프레스");
        exerciseTranslations.put("Армейский жим", "밀리터리 프레스");
        exerciseTranslations.put("Сгибание рук", "바이셉 컬");
        exerciseTranslations.put("Разгибание рук", "트라이셉 익스텐션");
        exerciseTranslations.put("Разведение рук", "레터럴 레이즈");
        exerciseTranslations.put("Тяга", "로우");
        exerciseTranslations.put("Румынская тяга", "루마니안 데드리프트");
        exerciseTranslations.put("Фронтальные приседания", "프론트 스쿼트");
        exerciseTranslations.put("Приседания с гантелями", "덤벨 스쿼트");
        exerciseTranslations.put("Гоблет приседания", "고블릿 스쿼트");
        exerciseTranslations.put("Выпады с гантелями", "덤벨 런지");
        exerciseTranslations.put("Мостик", "글루트 브릿지");
        exerciseTranslations.put("Толчок бедрами", "힙 쓰러스트");
        exerciseTranslations.put("Скручивания", "크런치");
        exerciseTranslations.put("Подъем туловища", "윗몸일으키기");
        exerciseTranslations.put("Боковая планка", "사이드 플랭크");
        exerciseTranslations.put("Русские скручивания", "러시안 트위스트");
        exerciseTranslations.put("Велосипед", "바이시클 크런치");
        exerciseTranslations.put("Подъем ног", "레그 레이즈");
        exerciseTranslations.put("Альпинист", "마운틴 클라이머");
        exerciseTranslations.put("Джампинг джек", "점핑잭");
        exerciseTranslations.put("Высокие колени", "하이 니즈");
        exerciseTranslations.put("Удары по ягодицам", "벗 킥스");
        
        // === 일본어 번역 ===
        exerciseTranslations.put("スクワット", "스쿼트");
        exerciseTranslations.put("プッシュアップ", "푸시업");
        exerciseTranslations.put("チンアップ", "턱걸이");
        exerciseTranslations.put("プランク", "플랭크");
        exerciseTranslations.put("バーピー", "버피");
        exerciseTranslations.put("ランジ", "런지");
        exerciseTranslations.put("デッドリフト", "데드리프트");
        exerciseTranslations.put("ベンチプレス", "벤치프레스");
        exerciseTranslations.put("ミリタリープレス", "밀리터리 프레스");
        exerciseTranslations.put("バイセップカール", "바이셉 컬");
        exerciseTranslations.put("トライセップエクステンション", "트라이셉 익스텐션");
        exerciseTranslations.put("ラテラルレイズ", "레터럴 레이즈");
        exerciseTranslations.put("ロー", "로우");
        exerciseTranslations.put("ルーマニアンデッドリフト", "루마니안 데드리프트");
        exerciseTranslations.put("フロントスクワット", "프론트 스쿼트");
        exerciseTranslations.put("ダンベルスクワット", "덤벨 스쿼트");
        exerciseTranslations.put("ゴブレットスクワット", "고블릿 스쿼트");
        exerciseTranslations.put("ダンベルランジ", "덤벨 런지");
        exerciseTranslations.put("グルートブリッジ", "글루트 브릿지");
        exerciseTranslations.put("ヒップスラスト", "힙 쓰러스트");
        exerciseTranslations.put("クランチ", "크런치");
        exerciseTranslations.put("シットアップ", "윗몸일으키기");
        exerciseTranslations.put("サイドプランク", "사이드 플랭크");
        exerciseTranslations.put("ロシアンツイスト", "러시안 트위스트");
        exerciseTranslations.put("バイシクルクランチ", "바이시클 크런치");
        exerciseTranslations.put("レッグレイズ", "레그 레이즈");
        exerciseTranslations.put("マウンテンクライマー", "마운틴 클라이머");
        exerciseTranslations.put("ジャンピングジャック", "점핑잭");
        exerciseTranslations.put("ハイニーズ", "하이 니즈");
        exerciseTranslations.put("バットキック", "벗 킥스");
        
        // === 중국어 번역 ===
        exerciseTranslations.put("深蹲", "스쿼트");
        exerciseTranslations.put("俯卧撑", "푸시업");
        exerciseTranslations.put("引体向上", "턱걸이");
        exerciseTranslations.put("平板支撑", "플랭크");
        exerciseTranslations.put("波比跳", "버피");
        exerciseTranslations.put("弓步", "런지");
        exerciseTranslations.put("硬拉", "데드리프트");
        exerciseTranslations.put("卧推", "벤치프레스");
        exerciseTranslations.put("军事推举", "밀리터리 프레스");
        exerciseTranslations.put("二头弯举", "바이셉 컬");
        exerciseTranslations.put("三头伸展", "트라이셉 익스텐션");
        exerciseTranslations.put("侧平举", "레터럴 레이즈");
        exerciseTranslations.put("划船", "로우");
        exerciseTranslations.put("罗马尼亚硬拉", "루마니안 데드리프트");
        exerciseTranslations.put("前蹲", "프론트 스쿼트");
        exerciseTranslations.put("哑铃深蹲", "덤벨 스쿼트");
        exerciseTranslations.put("高脚杯深蹲", "고블릿 스쿼트");
        exerciseTranslations.put("哑铃弓步", "덤벨 런지");
        exerciseTranslations.put("臀桥", "글루트 브릿지");
        exerciseTranslations.put("臀推", "힙 쓰러스트");
        exerciseTranslations.put("卷腹", "크런치");
        exerciseTranslations.put("仰卧起坐", "윗몸일으키기");
        exerciseTranslations.put("侧平板", "사이드 플랭크");
        exerciseTranslations.put("俄罗斯转体", "러시안 트위스트");
        exerciseTranslations.put("自行车卷腹", "바이시클 크런치");
        exerciseTranslations.put("抬腿", "레그 레이즈");
        exerciseTranslations.put("登山者", "마운틴 클라이머");
        exerciseTranslations.put("开合跳", "점핑잭");
        exerciseTranslations.put("高抬腿", "하이 니즈");
        exerciseTranslations.put("踢臀", "벗 킥스");
        
        // === 한국어 번역 ===
        exerciseTranslations.put("스쿼트", "스쿼트");
        exerciseTranslations.put("푸시업", "푸시업");
        exerciseTranslations.put("턱걸이", "턱걸이");
        exerciseTranslations.put("플랭크", "플랭크");
        exerciseTranslations.put("버피", "버피");
        exerciseTranslations.put("런지", "런지");
        exerciseTranslations.put("데드리프트", "데드리프트");
        exerciseTranslations.put("벤치프레스", "벤치프레스");
        exerciseTranslations.put("밀리터리 프레스", "밀리터리 프레스");
        exerciseTranslations.put("바이셉 컬", "바이셉 컬");
        exerciseTranslations.put("트라이셉 익스텐션", "트라이셉 익스텐션");
        exerciseTranslations.put("레터럴 레이즈", "레터럴 레이즈");
        exerciseTranslations.put("로우", "로우");
        exerciseTranslations.put("루마니안 데드리프트", "루마니안 데드리프트");
        exerciseTranslations.put("프론트 스쿼트", "프론트 스쿼트");
        exerciseTranslations.put("덤벨 스쿼트", "덤벨 스쿼트");
        exerciseTranslations.put("고블릿 스쿼트", "고블릿 스쿼트");
        exerciseTranslations.put("덤벨 런지", "덤벨 런지");
        exerciseTranslations.put("글루트 브릿지", "글루트 브릿지");
        exerciseTranslations.put("힙 쓰러스트", "힙 쓰러스트");
        exerciseTranslations.put("크런치", "크런치");
        exerciseTranslations.put("윗몸일으키기", "윗몸일으키기");
        exerciseTranslations.put("사이드 플랭크", "사이드 플랭크");
        exerciseTranslations.put("러시안 트위스트", "러시안 트위스트");
        exerciseTranslations.put("바이시클 크런치", "바이시클 크런치");
        exerciseTranslations.put("레그 레이즈", "레그 레이즈");
        exerciseTranslations.put("마운틴 클라이머", "마운틴 클라이머");
        exerciseTranslations.put("점핑잭", "점핑잭");
        exerciseTranslations.put("하이 니즈", "하이 니즈");
        exerciseTranslations.put("벗 킥스", "벗 킥스");
        
        return exerciseTranslations.get(englishName) != null ? exerciseTranslations.get(englishName) : englishName;
    }

    // translations 배열에서 한국어 설명 가져오기
    private String getDescriptionFromTranslations(Map<String, Object> wgerExercise) {
        if (!wgerExercise.containsKey("translations")) {
            return null;
        }
        
        List<Map<String, Object>> translations = getList(wgerExercise.get("translations"));
        if (translations == null) {
            return null;
        }
        
        // 한국어 번역을 우선적으로 찾기 (language=7)
        for (Map<String, Object> translation : translations) {
            Integer language = getIntegerValue(translation.get("language"));
            if (language != null && language == 7) {
                String description = getStringValue(translation.get("description"));
                if (description != null && !description.trim().isEmpty()) {
                    return description;
                }
            }
        }
        
        // 한국어 번역이 없으면 영어 번역 찾기 (language=2)
        for (Map<String, Object> translation : translations) {
            Integer language = getIntegerValue(translation.get("language"));
            if (language != null && language == 2) {
                String description = getStringValue(translation.get("description"));
                if (description != null && !description.trim().isEmpty()) {
                    return description;
                }
            }
        }
        
        return null;
    }

    // 안전한 Integer 변환 헬퍼 메서드
    private Integer getIntegerValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Integer) {
            return (Integer) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    // 안전한 String 변환 헬퍼 메서드
    private String getStringValue(Object value) {
        if (value == null) {
            return null;
        }
        return value.toString();
    }

    // 안전한 Integer List 변환 헬퍼 메서드
    @SuppressWarnings("unchecked")
    private List<Integer> getIntegerList(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof List) {
            List<?> list = (List<?>) value;
            List<Integer> result = new ArrayList<>();
            for (Object item : list) {
                Integer intValue = getIntegerValue(item);
                if (intValue != null) {
                    result.add(intValue);
                }
            }
            return result;
        }
        return null;
    }

    // 안전한 List 변환 헬퍼 메서드
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getList(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof List) {
            return (List<Map<String, Object>>) value;
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMapValue(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        return null;
    }

    @Transactional(readOnly = true)
    public List<Exercise> searchExercises(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return exerciseRepository.findAll();
        }
        return exerciseRepository.findByNameContainingIgnoreCase(keyword);
    }

    @Transactional(readOnly = true)
    public List<Exercise> searchExercises(String keyword, String muscle) {
        if (muscle != null && !muscle.trim().isEmpty()) {
            if (keyword != null && !keyword.trim().isEmpty()) {
                // 키워드와 근육 모두 필터링
                return exerciseRepository.findByNameContainingIgnoreCaseAndMusclesContaining(keyword, muscle);
            } else {
                // 근육만 필터링
                return exerciseRepository.findByMusclesContaining(muscle);
            }
        } else {
            // 기존 키워드 검색
            return searchExercises(keyword);
        }
    }

    @Transactional(readOnly = true)
    public List<String> getAllMuscles() {
        return exerciseRepository.findAllDistinctMuscles();
    }

    @Transactional(readOnly = true)
    public List<String> getAllCategories() {
        return exerciseRepository.findAllDistinctCategories();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> searchExercisesWithPagination(String keyword, String muscle, String category, String intensity, int page, int size) {
        List<Exercise> allExercises;
        
        if (muscle != null && !muscle.trim().isEmpty()) {
            if (keyword != null && !keyword.trim().isEmpty()) {
                // 키워드와 (주/보조)근육 모두 필터링
                allExercises = exerciseRepository.findByNameContainingIgnoreCaseAndAnyMuscleContaining(keyword, muscle);
            } else {
                // (주/보조) 근육만 필터링
                allExercises = exerciseRepository.findByAnyMuscleContaining(muscle);
            }
        } else if (keyword != null && !keyword.trim().isEmpty()) {
            // 키워드만 필터링
            allExercises = exerciseRepository.findByNameContainingIgnoreCase(keyword);
        } else {
            // 모든 운동 가져오기
            allExercises = exerciseRepository.findAll();
        }
        
        // 카테고리 필터 추가 적용
        if (category != null && !category.trim().isEmpty()) {
            String normalized = category.trim();
            allExercises = allExercises.stream()
                .filter(e -> normalized.equalsIgnoreCase(String.valueOf(e.getCategory())))
                .toList();
        }

        // 강도 필터 적용 (LOW/MEDIUM/HIGH). 한글 입력 지원: 낮음/보통/높음
        if (intensity != null && !intensity.trim().isEmpty()) {
            String norm = normalizeIntensity(intensity);
            allExercises = allExercises.stream()
                .filter(e -> e.getIntensity() != null && normalizeIntensity(e.getIntensity()).equals(norm))
                .toList();
        }

        // 안정적인 페이지네이션을 위해 id 기준 정렬
        allExercises = new ArrayList<>(allExercises); // toList() 불변 방지
        allExercises.sort(Comparator.comparing(Exercise::getId));
        
        // MET 필터 제거: 전체 운동 사용
        // 전체 개수
        int totalElements = allExercises.size();
        
        // 페이지네이션 적용
        int startIndex = page * size;
        int endIndex = Math.min(startIndex + size, totalElements);
        
        List<Exercise> pagedExercises;
        if (startIndex >= totalElements) {
            pagedExercises = List.of();
        } else {
            pagedExercises = allExercises.subList(startIndex, endIndex);
        }
        
        // 응답 데이터 구성
        Map<String, Object> result = Map.of(
            "content", pagedExercises,
            "totalElements", totalElements,
            "totalPages", (int) Math.ceil((double) totalElements / size),
            "currentPage", page,
            "size", size,
            "hasNext", endIndex < totalElements,
            "hasPrevious", page > 0
        );
        
        return result;
    }

    private String normalizeIntensity(String raw) {
        String v = raw.trim().toUpperCase();
        // 한글 매핑
        if (v.contains("높")) return "HIGH";
        if (v.contains("보통") || v.contains("중")) return "MEDIUM";
        if (v.contains("낮")) return "LOW";
        // 영문 그대로 허용
        if (v.startsWith("HI")) return "HIGH";
        if (v.startsWith("ME")) return "MEDIUM";
        if (v.startsWith("LO")) return "LOW";
        return v;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExercisesWithMets(int page, int size, String keyword, String muscle, String category) {
        try {
            List<Exercise> allExercises;
            if (keyword != null && !keyword.trim().isEmpty()) {
                allExercises = exerciseRepository.findByNameContainingIgnoreCase(keyword);
            } else if (muscle != null && !muscle.trim().isEmpty()) {
                allExercises = exerciseRepository.findByMusclesContaining(muscle);
            } else {
                allExercises = exerciseRepository.findAllExercises();
            }

            // 카테고리 필터 적용 (시드의 target_areas 1차 값과 매칭)
            if (category != null && !category.trim().isEmpty()) {
                String normalized = category.trim();
                allExercises = allExercises.stream()
                    .filter(e -> normalized.equalsIgnoreCase(String.valueOf(e.getCategory())))
                    .toList();
            }

            // Stream.toList()는 불변 리스트를 반환하므로 정렬 전에 가변 리스트로 변환
            allExercises = new ArrayList<>(allExercises);
            allExercises.sort(Comparator.comparing(Exercise::getId));

            int totalElements = allExercises.size();
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, totalElements);
            List<Exercise> pagedExercises = startIndex >= totalElements ? List.of() : allExercises.subList(startIndex, endIndex);

            return Map.of(
                "content", pagedExercises,
                "totalElements", totalElements,
                "totalPages", (int) Math.ceil((double) totalElements / size),
                "currentPage", page,
                "size", size,
                "hasNext", endIndex < totalElements,
                "hasPrevious", page > 0
            );
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "운동 조회 실패: " + (e.getMessage() != null ? e.getMessage() : "알 수 없는 오류"));
            return errorResponse;
        }
    }

    // Wger 로드 엔드포인트가 호출하던 메서드 제거
    // @Transactional
    // public void loadExerciseDataFromWger() { /* removed */ }

    private Map<String, Object> createPaginationResponse(Page<Exercise> exercisePage) {
        return Map.of(
            "content", exercisePage.getContent(),
            "totalElements", exercisePage.getTotalElements(),
            "totalPages", exercisePage.getTotalPages(),
            "currentPage", exercisePage.getNumber(),
            "size", exercisePage.getSize(),
            "hasNext", exercisePage.hasNext(),
            "hasPrevious", exercisePage.hasPrevious()
        );
    }

    @Transactional
    public void reloadExercisesFromSeed() {
        try (InputStream inputStream = getClass().getResourceAsStream("/exercises_seed.csv");
             BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, "UTF-8"))) {

            String line = reader.readLine(); // Read header

            while ((line = reader.readLine()) != null) {
                String[] data = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);

                if (data.length < 8) continue;

                String koreanName = data[0];
                Optional<Exercise> existingExercise = exerciseRepository.findByKoreanName(koreanName);

                Exercise exercise = existingExercise.orElse(new Exercise());
                exercise.setKoreanName(koreanName);
                exercise.setName(koreanName); // Use Korean name as default English name
                exercise.setMets(Double.parseDouble(data[1]));
                exercise.setCategory(data[2].split(";")[0]); // Use first target area as category
                exercise.setMuscles(Arrays.asList(data[3].split(";")));
                exercise.setMusclesSecondary(Arrays.asList(data[4].split(";")));
                
                String description = data[5];
                String instructions = data[7].replace("\"", "").replace("|", "\n");
                exercise.setDescription(description + "\n\n[운동 방법]\n" + instructions);

                exerciseRepository.save(exercise);
            }
        } catch (IOException e) {
            // Consider logging the error
            throw new RuntimeException("Failed to read or process seed data", e);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExerciseDetailById(Long id) {
        Optional<Exercise> exerciseOpt = exerciseRepository.findById(id);
        if (exerciseOpt.isEmpty()) {
            return null;
        }
        
        Exercise exercise = exerciseOpt.get();
        
        // CSV에서 instructions_ko 데이터 추출
        List<String> instructionsKo = getInstructionsFromCsv(exercise.getName());
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", exercise.getId());
        result.put("name", exercise.getName());
        result.put("koreanName", exercise.getKoreanName());
        result.put("description", exercise.getDescription());
        result.put("category", exercise.getCategory());
        result.put("muscleGroup", exercise.getMuscleGroup());
        result.put("equipment", exercise.getEquipment());
        result.put("muscles", exercise.getMuscles());
        result.put("musclesSecondary", exercise.getMusclesSecondary());
        result.put("mets", exercise.getMets());
        result.put("intensity", exercise.getIntensity());
        result.put("instructionsKo", instructionsKo);
        
        return result;
    }
    
    private List<String> getInstructionsFromCsv(String exerciseName) {
        try (InputStream inputStream = getClass().getResourceAsStream("/exercises_seed.csv");
             BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, "UTF-8"))) {

            String line = reader.readLine(); // Read header

            while ((line = reader.readLine()) != null) {
                String[] data = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);

                if (data.length >= 8 && data[0].trim().equals(exerciseName)) {
                    String instructions = data[7].replace("\"", "");
                    return Arrays.asList(instructions.split("\\|"));
                }
            }
        } catch (IOException e) {
            System.err.println("CSV 파일 읽기 실패: " + e.getMessage());
        }
        
        return new ArrayList<>();
    }
} 