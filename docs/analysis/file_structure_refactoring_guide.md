# FitMate 프로젝트 파일 구조 리팩토링 가이드

## 1. 목표

본 문서는 FitMate 프로젝트의 코드베이스를 보다 확장 가능하고 유지보수하기 쉬운 구조로 개선하는 것을 목표로 합니다. 현재의 **타입 기반(type-based) 구조**에서 **기능 기반(feature-based) 구조**로 점진적으로 전환하는 구체적인 계획을 제시합니다.

### 핵심 원칙
- **응집도 (Cohesion):** 관련된 파일(컴포넌트, 훅, 스타일, 테스트 등)은 하나의 기능 폴더에 함께 위치시킵니다.
- **결합도 (Coupling):** 기능 간의 의존성을 최소화하여 한 기능의 변경이 다른 기능에 미치는 영향을 줄입니다.
- **확장성 (Scalability):** 새로운 기능을 추가하거나 기존 기능을 제거할 때, 코드베이스의 특정 부분만 수정/삭제할 수 있도록 합니다.

---

## 2. Frontend 리팩토링 계획 (`frontend/src`)

현재 프론트엔드 `components` 폴더는 모든 컴포넌트가 하나의 계층에 존재하여 가독성과 유지보수성이 저하되고 있습니다. 이를 기능 중심으로 재편합니다.

### AS-IS (현재 구조)
```
frontend/src/
└── components/
    ├── AuthGuard.tsx
    ├── Calendar.tsx
    ├── ChatPage.tsx
    ├── Dashboard.tsx
    ├── MemberForm.tsx
    ├── MotionCoach.tsx
    ├── NotificationCenter.tsx
    └── ... (그 외 다수의 컴포넌트)
```

### TO-BE (제안 구조)
```
frontend/src/
├── features/
│   ├── authentication/
│   │   ├── components/
│   │   │   ├── SignupForm.tsx
│   │   │   └── OAuth2Callback.tsx
│   │   ├── hooks/
│   │   └── services/
│   ├── chat/
│   │   ├── components/
│   │   │   ├── ChatDashboard.tsx
│   │   │   └── ChatRoom.tsx
│   │   └── ...
│   ├── workout/
│   │   ├── components/
│   │   │   ├── MotionCoach.tsx
│   │   │   └── TodayChecklist.tsx
│   │   └── ...
│   └── ... (profile, calendar 등 다른 기능 폴더)
│
├── components/
│   └── ui/
│       ├── Modal.tsx
│       ├── ToastProvider.tsx
│       ├── NavigationBar.tsx
│       └── ... (여러 기능에서 공통으로 사용하는 순수 UI 컴포넌트)
│
├── services/ (전역 API 서비스)
├── hooks/    (전역 커스텀 훅)
└── utils/    (전역 유틸리티 함수)
```

---

## 3. Backend 및 Communication Server 가이드

### Backend (Spring Boot)
- **계층별 구조 유지:** `controller`, `service`, `repository` 등 기존의 계층별 패키지 구조는 유지합니다.
- **기능별 그룹화 도입:** 각 계층 패키지 내에서 `user`, `workout`, `chat` 등 기능(도메인)별로 하위 패키지를 만들어 클래스를 그룹화하여 응집도를 높입니다.
  ```
  com.fitmate.backend/
  └── user/
      ├── UserController.java
      ├── UserService.java
      └── UserRepository.java
  ```

### Communication Server (NestJS)
- **기능별 모듈 구조 강화:** 현재 `chat`, `notifications`, `sms`로 잘 분리된 모듈 구조를 계속 유지하고, 새로운 기능 추가 시 이 패턴을 일관되게 따릅니다.

---

## 4. 단계별 실행 계획

리팩토링은 위험을 최소화하기 위해 점진적으로 진행합니다.

1.  **공용 컴포넌트 분리:** `frontend/src/components/ui` 폴더를 생성하고, 여러 기능에서 공통으로 사용되는 `Modal`, `Button`, `Toast` 등의 컴포넌트를 먼저 이동시킵니다.
2.  **`features` 폴더 생성:** `frontend/src/features` 디렉토리를 생성합니다.
3.  **기능 단위 마이그레이션:** 가장 독립적인 기능(e.g., `notifications`)을 하나 선택하여 `features` 폴더 아래에 해당 기능 폴더를 만들고 관련 파일들을 모두 이동시킵니다.
4.  **경로 수정 및 테스트:** 이동된 기능과 관련된 모든 `import` 경로를 수정하고, 애플리케이션을 실행하여 기능이 정상적으로 동작하는지 철저히 테스트합니다.
5.  **반복:** 모든 기능이 `features` 폴더로 이동할 때까지 3-4번 과정을 반복합니다.

---

## 5. Refactoring To-Do List

아래 목록을 사용하여 리팩토링 진행 상황을 추적하세요.

- [ ] **Phase 1: 공용 UI 컴포넌트 분리**
  - [ ] `frontend/src/components/ui` 폴더 생성
  - [ ] `Modal.tsx` 이동 및 관련 경로 수정
  - [ ] `ToastProvider.tsx` 이동 및 관련 경로 수정
  - [ ] `NavigationBar.tsx` 이동 및 관련 경로 수정
  - [ ] (그 외 공용 컴포넌트 추가)

- [ ] **Phase 2: `features` 디렉토리 설정**
  - [ ] `frontend/src/features` 폴더 생성

- [ ] **Phase 3: 기능별 마이그레이션**
  - [ ] `notifications` 기능 마이그레이션 및 테스트
  - [ ] `authentication` 기능 마이그레이션 및 테스트
  - [ ] `profile` 기능 마이그레이션 및 테스트
  - [ ] `calendar` 기능 마이그레이션 및 테스트
  - [ ] `workout` 기능 마이그레이션 및 테스트
  - [ ] `chat` 기능 마이그레이션 및 테스트

- [ ] **Phase 4: 백엔드 패키지 구조 개선**
  - [ ] `user` 도메인 패키지 그룹화
  - [ ] `workout` 도메인 패키지 그룹화
  - [ ] (그 외 도메인 추가)

- [ ] **Phase 5: 최종 검토**
  - [ ] 불필요하게 남은 폴더나 파일 제거
  - [ ] 팀원들과 코드 리뷰 진행
