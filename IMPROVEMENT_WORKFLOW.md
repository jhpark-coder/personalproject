# 운동 추천 시스템 개선 워크플로우 (단기 집중)

이 문서는 분석된 내용을 바탕으로, 1-2일 내에 완료 가능한 단기 개선 작업 흐름을 정의합니다.

---

## Phase 1: 보안 및 안정성 강화 (Security & Validation) - 예상 소요: 3-4시간

### Task 1.1: API 입력값 검증을 위한 DTO 생성
- **목표:** `Map<String, Object>` 대신 명시적인 DTO(Data Transfer Object)를 사용하여 타입 안정성을 확보하고 예상치 못한 입력값을 차단합니다.
- **작업 내용:**
    - `src/main/java/backend/fitmate/dto` 디렉토리에 `WorkoutRecommendationRequest.java` 파일을 생성합니다.
    - `goal`, `experience`, `weight`, `height`, `age` 필드를 정의합니다.
    - `javax.validation.constraints` (`@NotNull`, `@Min` 등) 어노테이션을 사용하여 각 필드에 대한 유효성 검사 규칙을 추가합니다.

### Task 1.2: Controller에 DTO 및 유효성 검사 적용
- **목표:** API 엔드포인트가 DTO를 사용하도록 변경하고, 유효성 검사 실패 시 일관된 오류를 반환하도록 합니다.
- **작업 내용:**
    - `WorkoutRecommendationController.java`의 `getWorkoutRecommendation` 메소드 시그니처를 `@RequestBody Map<String, Object> userData`에서 `@Valid @RequestBody WorkoutRecommendationRequest request`로 변경합니다.
    - `@Valid` 어노테이션을 통해 DTO 유효성 검사가 자동으로 수행되도록 합니다.
    - 유효성 검사 실패 시 `MethodArgumentNotValidException`을 처리하는 전역 예외 핸들러(`@ControllerAdvice`)를 추가하여 400 Bad Request와 함께 명확한 오류 메시지를 반환하도록 설정합니다.

### Task 1.3: CORS 정책 구체화
- **목표:** 프로덕션 환경에서 발생할 수 있는 CSRF 공격을 방지하기 위해 CORS 정책을 강화합니다.
- **작업 내용:**
    - `application.properties` 또는 `application-prod.properties`에 허용할 프론트엔드 도메인을 명시적으로 추가합니다. (예: `cors.allowed-origins=http://fitmate.com`)
    - `WorkoutRecommendationController.java`의 `@CrossOrigin(origins = "*")`를 제거하고, `WebMvcConfigurer`를 구현한 전역 CORS 설정 클래스를 통해 프로퍼티 값을 읽어와 적용합니다.

### Task 1.4: API 엔드포인트 보안 적용
- **목표:** 인증된 사용자만 운동 추천 API를 사용할 수 있도록 접근을 제어합니다.
- **작업 내용:**
    - Spring Security 의존성이 `pom.xml`에 추가되어 있는지 확인합니다.
    - Security 설정 클래스에서 `/api/workout/recommend` 엔드포인트에 대해 `authenticated()` 규칙을 적용합니다.

---

## Phase 2: 코드 품질 및 리팩토링 (Code Quality & Refactoring) - 예상 소요: 4-5시간

### Task 2.1: 하드코딩된 운동 데이터 외부화
- **목표:** 코드 변경 및 재배포 없이 운동 데이터를 관리할 수 있도록 하드코딩된 데이터를 외부 파일로 분리합니다.
- **작업 내용:**
    - `src/main/resources`에 `workout-data.json` 또는 `workout-data.csv` 파일을 생성합니다.
    - `WorkoutRecommendationService.java`에 하드코딩된 운동 목록(준비운동, 본운동, 마무리운동), MET 값, AI 코칭 지원 여부 등을 이 파일로 옮깁니다.
    - 애플리케이션 시작 시 이 파일을 읽어 메모리에 로드하는 `WorkoutDataInitializer` 컴포넌트를 작성합니다.
    - `WorkoutRecommendationService`는 이 초기화된 데이터를 사용하도록 변경합니다.

### Task 2.2: `WorkoutRecommendationService` 책임 분리
- **목표:** 거대 클래스(God Class)인 `WorkoutRecommendationService`의 책임을 분리하여 코드의 응집도를 높이고 테스트 용이성을 확보합니다.
- **작업 내용:**
    - **`UserProfileService` 생성:** BMI 계산, BMI 카테고리 분류, 피트니스 레벨 계산 등 사용자 프로필과 관련된 로직을 이 서비스로 옮깁니다.
    - **`WorkoutPlanService` 생성:** `createWorkoutPlan`, `getMainExercises` 등 실제 운동 계획을 생성하는 로직을 이 서비스로 옮깁니다.
    - **`WorkoutRecommendationService` 재구성:** 여러 서비스를 오케스트레이션하는 역할만 남깁니다. 즉, `UserProfileService`와 `WorkoutPlanService`를 호출하여 최종 추천 결과를 조합하는 역할만 수행합니다.

---

## Phase 3: 검증 (Verification) - 예상 소요: 2-3시간

### Task 3.1: 단위 테스트 작성
- **목표:** 리팩토링된 코드의 안정성을 보장하고, 향후 변경에 대한 신뢰도를 높입니다.
- **작업 내용:**
    - `src/test/java` 디렉토리에 분리된 서비스(`UserProfileService`, `WorkoutPlanService`)에 대한 단위 테스트를 작성합니다.
    - JUnit5와 Mockito를 사용하여 의존성을 격리하고 각 서비스의 핵심 로직을 검증합니다.
    - 다양한 사용자 입력값(정상, 경계값, 예외)에 대한 테스트 케이스를 포함합니다.

### Task 3.2: 통합 및 E2E 테스트
- **목표:** 모든 변경 사항이 통합된 후에도 시스템이 정상적으로 동작하는지 최종 확인합니다.
- **작업 내용:**
    - Postman이나 `curl`을 사용하여 변경된 `/api/workout/recommend` API를 직접 호출해봅니다.
        - 유효한 요청, 유효하지 않은 요청(필드 누락, 타입 오류 등)을 모두 테스트합니다.
    - 프론트엔드와 연동하여 실제 사용자 시나리오대로 운동 추천 기능이 동작하는지 확인합니다.
