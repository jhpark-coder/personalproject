# 운동 추천 시스템 개선 워크플로우

## 📋 현재 상태 분석
- ✅ **보안**: SecurityConfig + JWT 인증 완료
- ✅ **CORS**: 전역 설정 완료  
- ✅ **예외처리**: GlobalExceptionHandler 완료
- ✅ **핵심기능**: WorkoutRecommendationService 완전 구현
- ❌ **입력검증**: Map<String, Object> → DTO 필요
- ❌ **코드품질**: 하드코딩 데이터, 긴 메소드
- ❌ **테스트**: 단위 테스트 부재

---

## Phase 1: 입력값 검증 강화 (필수) - 예상 소요: 2-3시간

### Task 1.1: DTO 생성 및 유효성 검사
**목표**: 타입 안전성 확보 및 입력값 검증

```java
// src/main/java/backend/fitmate/dto/WorkoutRecommendationRequest.java
@Data
public class WorkoutRecommendationRequest {
    @NotBlank(message = "운동 목표를 선택해주세요")
    @Pattern(regexp = "diet|strength|body|fitness|stamina", message = "유효한 목표를 선택해주세요")
    private String goal;
    
    @NotBlank(message = "운동 경험을 선택해주세요") 
    @Pattern(regexp = "beginner|intermediate|advanced", message = "유효한 경험 레벨을 선택해주세요")
    private String experience;
    
    @NotNull(message = "체중을 입력해주세요")
    @DecimalMin(value = "30.0", message = "체중은 30kg 이상이어야 합니다")
    @DecimalMax(value = "200.0", message = "체중은 200kg 이하여야 합니다")
    private Double weight;
    
    @NotNull(message = "키를 입력해주세요")
    @DecimalMin(value = "100.0", message = "키는 100cm 이상이어야 합니다") 
    @DecimalMax(value = "250.0", message = "키는 250cm 이하여야 합니다")
    private Double height;
    
    @NotNull(message = "나이를 입력해주세요")
    @Min(value = 15, message = "나이는 15세 이상이어야 합니다")
    @Max(value = 100, message = "나이는 100세 이하여야 합니다")
    private Integer age;
}
```

### Task 1.2: Controller 업데이트
**작업 내용**:
- `WorkoutRecommendationController.java`의 `@RequestBody Map<String, Object> userData`를 `@Valid @RequestBody WorkoutRecommendationRequest request`로 변경
- Service 메소드도 DTO를 받도록 수정

### Task 1.3: 유효성 검사 예외 처리 추가
**작업 내용**:
- `GlobalExceptionHandler.java`에 `@ExceptionHandler(MethodArgumentNotValidException.class)` 추가
- 필드별 오류 메시지를 사용자 친화적으로 반환

---

## Phase 2: 코드 품질 개선 (선택) - 예상 소요: 3-4시간

### Task 2.1: 하드코딩된 데이터 외부화 (우선순위: 중)
**목표**: 유지보수성 향상

```java
// src/main/resources/workout-exercises.json
{
  "warmupExercises": [
    {"name": "제자리 뛰기", "target": "전신", "mets": 3.0},
    {"name": "스트레칭", "target": "전신", "mets": 2.0}
  ],
  "aiSupportedExercises": ["스쿼트", "런지", "푸시업", "플랭크"]
}
```

**구현 방법**:
- `@ConfigurationProperties`로 데이터 로드
- 또는 간단히 `@Value`로 JSON 파일 경로 지정

### Task 2.2: 긴 메소드 분리 (우선순위: 낮)
**목표**: 가독성 향상
- `generateRecommendation()` 메소드 분리
- 각 목표별 운동 생성 메소드들 정리

---

## Phase 3: 테스트 추가 (선택) - 예상 소요: 2-3시간

### Task 3.1: 핵심 로직 단위 테스트
**테스트 대상**:
- DTO 유효성 검사
- BMI 계산 로직  
- 칼로리 계산 로직
- 목표별 운동 추천 로직

### Task 3.2: Controller 통합 테스트
**테스트 시나리오**:
- 유효한 요청 → 성공 응답
- 유효하지 않은 요청 → 400 Bad Request + 상세 오류 메시지

---

## 🎯 권장 구현 순서

### 최소 필수 (2-3시간)
1. **Phase 1만 구현**: DTO + 유효성 검사
   - 즉시 효과: 타입 안전성, 명확한 API 스펙
   - 위험도: 낮음 (기존 기능에 영향 없음)

### 완전한 개선 (5-7시간)  
1. Phase 1: DTO + 유효성 검사
2. Phase 2.1: 데이터 외부화 (JSON 파일)
3. Phase 3.1: 핵심 로직 테스트만

### 과도한 작업 (피하세요)
- ❌ Service 3개로 분리 (기존 코드가 복잡하지 않음)
- ❌ 보안 설정 변경 (이미 완료됨)
- ❌ CORS 재설정 (이미 SecurityConfig에서 관리중)

---

## 💡 구현 팁

### DTO 변환 헬퍼 메소드
```java
// WorkoutRecommendationService.java에 추가
private Map<String, Object> toUserDataMap(WorkoutRecommendationRequest request) {
    Map<String, Object> userData = new HashMap<>();
    userData.put("goal", request.getGoal());
    userData.put("experience", request.getExperience());
    userData.put("weight", request.getWeight());
    userData.put("height", request.getHeight());
    userData.put("age", request.getAge());
    return userData;
}
```

### 점진적 마이그레이션
1. 새 DTO 엔드포인트 추가 (`/api/workout/recommend-v2`)
2. 프론트엔드에서 테스트 후 기존 엔드포인트 교체
3. 또는 기존 엔드포인트 직접 수정 (더 간단함)

---

## 📊 예상 효과

### Phase 1 완료 후
- ✅ API 명세 명확화
- ✅ 런타임 에러 → 컴파일 타임 에러  
- ✅ 사용자 친화적 오류 메시지
- ✅ 프론트엔드 개발 효율성 향상

### Phase 2 완료 후  
- ✅ 운동 데이터 관리 용이성
- ✅ 코드 가독성 향상
- ✅ 새로운 운동 추가 시 코드 변경 불필요

### Phase 3 완료 후
- ✅ 리팩토링 안정성 보장
- ✅ 버그 조기 발견
- ✅ CI/CD 파이프라인 통합 가능

---

## 🚨 주의사항

1. **기존 API 호환성**: 프론트엔드에서 사용 중이라면 점진적 마이그레이션 권장
2. **테스트 우선**: Phase 1 구현 후 기존 기능 동작 확인
3. **과도한 최적화 금지**: 현재 성능에 문제가 없다면 Phase 2.2는 생략 권장

---

*이 워크플로우는 실용적이고 점진적인 개선을 목표로 합니다. Phase 1만으로도 충분한 효과를 얻을 수 있습니다.*