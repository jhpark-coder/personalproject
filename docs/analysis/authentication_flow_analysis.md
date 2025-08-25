# FitMate 프로젝트 - 인증 시스템 플로우 분석

## 개요
FitMate 프로젝트의 회원가입, 로그인, 온보딩, 캘린더연결 플로우를 파일별, 메소드별로 상세히 분석한 문서입니다.

## 1. 로컬 회원가입 플로우

### 1.1 프론트엔드 (React)
**파일**: `frontend/src/features/authentication/components/SignupForm.tsx`

1. **사용자 입력 단계**
   - `handleSignup()` 메소드에서 폼 데이터 수집
   - 이메일, 비밀번호, 닉네임, 이름, 생년월일, 성별, 휴대전화번호 입력
   - `validateForm()` 메소드로 프론트엔드 유효성 검사

2. **API 호출**
   - `apiClient.post(API_ENDPOINTS.SIGNUP, formData)` 호출
   - `/api/auth/signup` 엔드포인트로 POST 요청

### 1.2 백엔드 (Spring Boot)
**파일**: `src/main/java/backend/fitmate/controller/AuthController.java`

3. **컨트롤러 처리**
   - `@PostMapping("/signup")` 메소드에서 요청 수신
   - 필수 필드 검증 (이메일, 비밀번호, 이름, 생년월일, 휴대전화번호)
   - `userService.signup()` 메소드 호출

**파일**: `src/main/java/backend/fitmate/User/service/UserService.java`

4. **비즈니스 로직**
   - `signup()` 메소드에서 닉네임/휴대전화번호 중복 확인
   - `passwordEncoder.encode(password)` 로 비밀번호 암호화
   - `User` 엔티티 생성 및 `userRepository.save(user)` 호출

5. **응답 반환**
   - JWT 토큰 생성 (`jwtTokenProvider.createToken()`)
   - 사용자 정보와 함께 성공 응답 반환

### 1.3 프론트엔드 응답 처리
6. **성공 처리**
   - `localStorage.setItem('justSignedUp', 'true')` 설정
   - `localStorage.setItem('currentProvider', 'local')` 설정
   - 온보딩 상태 초기화
   - 로그인 페이지로 리다이렉트

---

## 2. 로컬 로그인 플로우

### 2.1 프론트엔드 (React)
**파일**: `frontend/src/features/authentication/components/MemberForm.tsx`

1. **사용자 입력**
   - `handleLogin()` 메소드에서 이메일/비밀번호 수집
   - `apiClient.post(API_ENDPOINTS.LOGIN, {email, password})` 호출

### 2.2 백엔드 (Spring Boot)
**파일**: `src/main/java/backend/fitmate/controller/AuthController.java`

2. **컨트롤러 처리**
   - `@PostMapping("/login")` 메소드에서 요청 수신
   - 필수 필드 검증
   - `userService.findByEmail(email)` 로 사용자 조회

3. **인증 처리**
   - `passwordEncoder.matches(password, user.getPassword())` 로 비밀번호 검증
   - JWT 토큰 생성 (`jwtTokenProvider.createToken()`)

### 2.3 프론트엔드 응답 처리
4. **토큰 저장**
   - `localStorage.setItem('token', response.data.token)` 로 JWT 토큰 저장
   - `localStorage.setItem('user', JSON.stringify(response.data.user))` 로 사용자 정보 저장
   - `setUserFromLogin()` 메소드로 UserContext 업데이트

5. **리다이렉트**
   - 2초 후 대시보드(`/`)로 이동

---

## 3. 온보딩 플로우

### 3.1 온보딩 시작 조건
**파일**: `frontend/src/features/dashboard/components/Dashboard.tsx`

1. **온보딩 완료 여부 확인**
   - `useEffect()` 내에서 온보딩 완료 상태 확인
   - `localStorage.getItem('onboardingCompleted')` 확인
   - `onboardingCompleted_{provider}` 키로 프로바이더별 온보딩 상태 확인
   - 온보딩 미완료 시 `/onboarding/experience`로 리다이렉트

**파일**: `frontend/src/features/authentication/components/AuthGuard.tsx`

2. **인증 후 온보딩 체크**
   - `AuthGuard`에서 사용자 프로필 완성도 기반 온보딩 완료 판단
   - `user?.height && user?.weight && user?.age && user?.gender` 확인
   - 프로필 완성 시 온보딩 플래그 자동 보정

### 3.2 1단계: 운동 경험 선택
**파일**: `frontend/src/features/onboarding/components/OnboardingExperience.tsx`

3. **경험 선택 처리**
   - `handleExperienceSelect(experienceId)` 메소드로 선택된 경험 저장
   - `handleNext()` 메소드에서 `localStorage.setItem('userExperience', selectedExperience)` 저장
   - `/onboarding/goal` 페이지로 이동

### 3.3 2단계: 운동 목표 설정
**파일**: `frontend/src/features/onboarding/components/OnboardingGoal.tsx`

4. **목표 설정 처리**
   - 운동 목표 선택 (스트렝스, 탄탄한 몸, 다이어트, 신체 능력, 체력)
   - `localStorage.setItem('userGoal', selectedGoal)` 저장
   - `/onboarding/basic-info` 페이지로 이동

### 3.4 3단계: 기본 정보 입력
**파일**: `frontend/src/features/onboarding/components/OnboardingBasicInfo.tsx`

5. **기본 정보 처리**
   - 키, 체중, 나이, 성별, 전화번호 입력
   - SMS 인증 기능 (`handleSendSmsCode()`, `handleVerifySmsCode()`)
   - 생년월일 기반 나이 자동 계산 (`calculateAgeFromBirthDate()`)
   - `handleSubmit()` 메소드에서 API 호출: `PUT /api/auth/update-basic-info`
   - `/onboarding/complete` 페이지로 이동

### 3.5 4단계: 온보딩 완료
**파일**: `frontend/src/features/onboarding/components/OnboardingComplete.tsx`

6. **온보딩 완료 처리**
   - 구글 캘린더 연동 옵션 제공
   - `handleConnectGoogleCalendar()` 메소드에서 캘린더 연동 시작
   - `handleSkipCalendar()` 메소드에서 온보딩 완료 플래그 설정
   - `localStorage.setItem('onboardingCompleted', 'true')` 설정
   - `localStorage.setItem('onboardingCompleted_${provider}', 'true')` 설정
   - 대시보드(`/`)로 이동

---

## 4. 소셜 로그인 플로우 (Google)

### 4.1 프론트엔드 (React)
**파일**: `frontend/src/features/authentication/components/MemberForm.tsx`

1. **소셜 로그인 시작**
   - `handleSocialLogin(provider)` 메소드에서 OAuth 시작
   - `window.location.href = API_ENDPOINTS.OAUTH2_AUTHORIZATION(provider)` 로 리다이렉트

### 4.2 백엔드 (Spring Boot)
**파일**: `src/main/java/backend/fitmate/config/SecurityConfig.java`

2. **OAuth2 설정**
   - `@EnableWebSecurity` 어노테이션으로 OAuth2 활성화
   - `oauth2Login()` 설정에서 `userInfoEndpoint` 구성
   - `customOAuth2UserService`와 `customOidcUserService` 등록

3. **OAuth2 콜백 처리**
   - `/oauth2/authorization/google` 경로로 Google OAuth 시작
   - Google에서 `/login/oauth2/code/google` 경로로 콜백

**파일**: `src/main/java/backend/fitmate/config/CustomOAuth2UserService.java`

4. **사용자 정보 처리**
   - `loadUser()` 메소드에서 Google 사용자 정보 수신
   - `saveOrUpdateOAuth2User()` 메소드로 사용자 저장/업데이트

**파일**: `src/main/java/backend/fitmate/config/SecurityConfig.java`

5. **로그인 성공 처리**
   - `loginSuccessHandler()` 메소드에서 OAuth2 로그인 성공 처리
   - 기존 사용자 확인: `provider+oauthId` 또는 `email`로 조회
   - `ALLOW_SOCIAL_AUTO_SIGNUP` 환경변수로 자동 회원가입 제어
   - JWT 토큰 생성 및 프론트엔드 콜백 페이지로 리다이렉트

### 4.3 프론트엔드 콜백 처리
**파일**: `frontend/src/features/authentication/components/OAuth2Callback.tsx`

6. **콜백 처리**
   - URL 파라미터에서 `success`, `token`, `provider`, `isNewUser` 추출
   - 새 사용자인 경우: `/onboarding/experience` 페이지로 이동
   - 기존 사용자인 경우: 홈 페이지(`/`)로 이동

---

## 5. Google Calendar 연결 플로우

### 5.1 프론트엔드 (React)
**파일**: `frontend/src/features/calendar/components/Calendar.tsx`

1. **캘린더 연결 시작**
   - `handleConnectGoogleCalendar()` 메소드에서 연결 시작
   - `apiClient.get(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE)` 호출
   - `localStorage.setItem('calendarLinkingInProgress', 'true')` 설정

**파일**: `frontend/src/features/onboarding/components/OnboardingComplete.tsx`

2. **온보딩 완료 시 캘린더 연결**
   - `handleConnectGoogleCalendar()` 메소드에서 온보딩 완료 플래그 설정
   - `localStorage.setItem('onboardingCompleted', 'true')` 설정
   - `localStorage.setItem('onboardingCompleted_${provider}', 'true')` 설정

### 5.2 백엔드 (Spring Boot)
**파일**: `src/main/java/backend/fitmate/controller/CalendarController.java`

3. **캘린더 연결 시작**
   - `@GetMapping("/auth/google")` 메소드에서 연결 시작
   - 세션에 캘린더 연동 마커 저장: `calendar_linking_active`, `calendar_linking_user_id`
   - Redis에 세션 ID로 사용자 매핑 저장: `calendar_session:{sessionId}`
   - HttpOnly 쿠키에 `calendar_link_uid` 저장
   - `/oauth2/authorization/google-connect` 경로로 리다이렉트

**파일**: `src/main/java/backend/fitmate/config/CustomAuthorizationRequestResolver.java`

4. **OAuth 요청 커스터마이징**
   - `process()` 메소드에서 OAuth 요청 파라미터 수정
   - `access_type=offline`, `prompt=consent`, `include_granted_scopes=true` 추가
   - `state` 파라미터에 사용자 ID 매핑하여 Redis에 저장

**파일**: `src/main/java/backend/fitmate/config/CustomOidcUserService.java`

5. **OIDC 사용자 처리**
   - `loadUser()` 메소드에서 Google OIDC 사용자 정보 수신
   - 세션, Redis, 쿠키, state 순서로 `calendarLinkingUserId` 복구
   - `userService.addGoogleCalendarInfoByUserId()` 호출로 Google 정보 추가

**파일**: `src/main/java/backend/fitmate/config/SecurityConfig.java`

6. **캘린더 연결 성공 처리**
   - `loginSuccessHandler()` 메소드에서 캘린더 연결 감지
   - `isCalendarLink` 플래그로 캘린더 전용 처리
   - Google 토큰을 Redis에 저장: `google_token:{googleOAuthId}`
   - JWT 토큰 생성 및 프론트엔드 콜백 페이지로 리다이렉트

### 5.3 프론트엔드 콜백 처리
**파일**: `frontend/src/features/authentication/components/OAuth2Callback.tsx`

7. **캘린더 연결 완료**
   - `calendarOnly=true` 파라미터로 캘린더 전용 요청 감지
   - `localStorage.setItem('token', token)` 로 새 토큰 저장
   - `localStorage.setItem('calendarLinked', 'true')` 설정
   - 캘린더 페이지로 리다이렉트: `/calendar?linked=success`

---

## 6. JWT 인증 플로우

### 6.1 토큰 생성
**파일**: `src/main/java/backend/fitmate/config/JwtTokenProvider.java`

1. **토큰 생성**
   - `createToken()` 메소드에서 JWT 토큰 생성
   - 사용자 ID, 이메일, 이름, provider, oauthId, picture, role을 claims에 포함
   - HS512 알고리즘으로 서명, 30분 유효기간

### 6.2 토큰 검증
**파일**: `src/main/java/backend/fitmate/config/JwtAuthenticationFilter.java`

2. **요청별 토큰 검증**
   - `doFilterInternal()` 메소드에서 모든 요청에 대해 JWT 토큰 검증
   - `resolveToken()` 메소드로 Authorization 헤더에서 토큰 추출
   - `jwtTokenProvider.validateToken()` 로 토큰 유효성 검사
   - `jwtTokenProvider.getAuthentication()` 로 인증 객체 생성
   - `SecurityContextHolder.getContext().setAuthentication()` 로 보안 컨텍스트 설정

---

## 7. 보안 설정

### 7.1 Spring Security 설정
**파일**: `src/main/java/backend/fitmate/config/SecurityConfig.java`

1. **보안 체인 구성**
   - `defaultFilterChain()` 메소드에서 보안 설정
   - CSRF 비활성화, CORS 설정, 세션 관리
   - `/api/auth/**`, `/oauth2/**`, `/connect/oauth2/**` 경로는 인증 불필요
   - 나머지 모든 요청은 인증 필요

2. **OAuth2 설정**
   - `userInfoEndpoint`에서 `customOAuth2UserService`와 `customOidcUserService` 등록
   - `successHandler`에서 `loginSuccessHandler()` 등록
   - `redirectionEndpoint`에서 `/connect/oauth2/code/*` 경로 설정
   - `authorizationEndpoint`에서 `CustomAuthorizationRequestResolver` 등록

### 7.2 필터 체인
3. **필터 순서**
   - `CalendarLinkingLoggingFilter` (로깅용)
   - `JwtAuthenticationFilter` (JWT 인증)
   - `UsernamePasswordAuthenticationFilter` (기본 인증)

---

## 8. 데이터 흐름 요약

### 8.1 로컬 회원가입
```
SignupForm.handleSignup() → AuthController.signup() → UserService.signup() → UserRepository.save() → JWT 생성 → 프론트엔드 응답
```

### 8.2 로컬 로그인
```
MemberForm.handleLogin() → AuthController.login() → UserService.findByEmail() → 비밀번호 검증 → JWT 생성 → 프론트엔드 응답
```

### 8.3 온보딩 플로우
```
Dashboard(온보딩 체크) → OnboardingExperience → OnboardingGoal → OnboardingBasicInfo → OnboardingComplete → 대시보드
```

### 8.4 소셜 로그인
```
MemberForm.handleSocialLogin() → Google OAuth → CustomOAuth2UserService.loadUser() → UserService.saveOrUpdateOAuth2User() → SecurityConfig.loginSuccessHandler() → JWT 생성 → OAuth2Callback 처리 → 온보딩 또는 홈
```

### 8.5 캘린더 연결
```
Calendar.handleConnectGoogleCalendar() 또는 OnboardingComplete.handleConnectGoogleCalendar() → CalendarController.startGoogleAuth() → CustomAuthorizationRequestResolver.process() → Google OAuth → CustomOidcUserService.loadUser() → UserService.addGoogleCalendarInfoByUserId() → SecurityConfig.loginSuccessHandler() → JWT 생성 → OAuth2Callback 처리
```

---

## 9. 주요 설정 파일

### 9.1 OAuth2 설정
**파일**: `src/main/resources/application-dev.properties`
- Google OAuth2 클라이언트 ID/시크릿
- Google Calendar API 스코프 설정
- 리다이렉트 URI 설정

### 9.2 Nginx 설정
**파일**: `nginx/nginx.conf`
- `/connect/oauth2/` 경로를 백엔드로 프록시
- OAuth2 콜백 URI 라우팅

---

## 10. 문제점 및 개선사항

### 10.1 복잡성
- OAuth2 플로우가 여러 서비스에 분산되어 있어 추적이 어려움
- 세션, Redis, 쿠키, state 등 여러 방식으로 사용자 ID 복구 시도
- 캘린더 연결과 일반 소셜 로그인이 혼재
- 온보딩 플로우가 인증 플로우와 복잡하게 얽혀있음

### 10.2 개선 방안
- OAuth2 플로우를 단일 서비스로 통합
- 사용자 ID 복구 방식을 단일화
- 캘린더 연결과 소셜 로그인 플로우 분리
- 온보딩 플로우를 독립적인 서비스로 분리
- 더 명확한 에러 처리 및 로깅 