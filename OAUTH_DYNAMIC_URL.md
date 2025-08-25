# OAuth Dynamic URL Support for Quick Tunnel

## 개요

Quick Tunnel 환경에서 매번 변경되는 동적 URL에 대응하여 OAuth 리다이렉트 URL을 자동으로 설정하는 기능을 구현했습니다.

## 구현된 기능

### 1. 프론트엔드 동적 URL 감지 (`frontend/src/config/api.ts`)

- `getCurrentBaseUrl()`: 현재 브라우저의 origin을 감지
- `generateOAuthRedirectUrl(provider)`: provider별 동적 리다이렉트 URL 생성
- Quick Tunnel vs Localhost 환경 자동 구분

### 2. 백엔드 OAuth 리다이렉트 업데이트 API (`AuthController.java`)

- **엔드포인트**: `POST /api/auth/update-oauth-redirect`
- **기능**: 런타임에 OAuth 리다이렉트 URL을 HTTP 세션에 저장
- **요청 파라미터**:
  ```json
  {
    "baseUrl": "https://quick-tunnel-url.loca.lt",
    "provider": "google"
  }
  ```

### 3. OAuth 헬퍼 함수 (`frontend/src/utils/oauthHelper.ts`)

- `handleDynamicOAuthLogin(provider, isCalendarOnly)`: 통합 OAuth 로그인 처리
- `getOAuthEnvironmentInfo()`: 환경 정보 확인
- Quick Tunnel 환경 자동 감지 및 백엔드 업데이트 호출

### 4. 컴포넌트 적용

- **MemberForm.tsx**: 로그인 페이지의 소셜 로그인 버튼에 동적 OAuth 기능 적용
- **OAuth2Callback.tsx**: 기존 콜백 처리는 그대로 유지

## 테스트 및 검증

### OAuth 환경 테스트 페이지
- **URL**: `/oauth-test`
- **기능**:
  - 현재 환경 정보 확인 (Localhost vs Quick Tunnel)
  - 백엔드 OAuth 업데이트 API 테스트
  - 동적 리다이렉트 URL 생성 테스트

## 사용 방법

### Localhost 환경
기존과 동일하게 작동. 환경변수에 설정된 고정 URL 사용.

### Quick Tunnel 환경
1. 사용자가 소셜 로그인 버튼 클릭
2. 시스템이 자동으로 Quick Tunnel URL 감지
3. 백엔드에 동적 리다이렉트 URL 업데이트 요청
4. OAuth 인증 페이지로 리다이렉트
5. 인증 완료 후 동적 URL로 콜백 처리

## 지원되는 OAuth 프로바이더

- Google OAuth2
- Kakao OAuth2  
- Naver OAuth2

## 환경 변수 설정

기존 환경변수는 localhost 기본값으로 유지:
```properties
# application-dev.properties
spring.security.oauth2.client.registration.google.redirect-uri=${OAUTH_REDIRECT_URI:http://localhost/login/oauth2/code/google}
spring.security.oauth2.client.registration.kakao.redirect-uri=${KAKAO_REDIRECT_URI:http://localhost/login/oauth2/code/kakao}
spring.security.oauth2.client.registration.naver.redirect-uri=${NAVER_REDIRECT_URI:http://localhost/login/oauth2/code/naver}
```

Quick Tunnel 환경에서는 런타임에 동적으로 업데이트됩니다.

## 검증할 8가지 로그인 경로

### Localhost 환경 (4가지)
1. `http://localhost` - Local 회원가입/로그인
2. `http://localhost` - Google OAuth2 로그인  
3. `http://localhost` - Kakao OAuth2 로그인
4. `http://localhost` - Naver OAuth2 로그인

### Quick Tunnel 환경 (4가지)
1. `https://quick-tunnel.loca.lt` - Local 회원가입/로그인
2. `https://quick-tunnel.loca.lt` - Google OAuth2 로그인 (동적 URL)
3. `https://quick-tunnel.loca.lt` - Kakao OAuth2 로그인 (동적 URL)  
4. `https://quick-tunnel.loca.lt` - Naver OAuth2 로그인 (동적 URL)

## 다음 단계

1. 실제 Quick Tunnel 환경에서 테스트 진행
2. OAuth 프로바이더별 리다이렉트 URL 동적 업데이트 검증
3. 오류 처리 및 사용자 경험 개선