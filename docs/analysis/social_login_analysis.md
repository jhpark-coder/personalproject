# FitMate 프로젝트 - 소셜 로그인 시스템 분석

## 개요
FitMate 프로젝트의 OAuth2 기반 소셜 로그인 시스템에 대한 상세 분석입니다. Google, Kakao, Naver 3개 프로바이더를 지원하며, Spring Security OAuth2와 JWT를 결합한 하이브리드 인증 방식을 사용합니다.

## 지원하는 소셜 로그인 프로바이더

### 1. Google OAuth2
- **사용자층**: 글로벌 사용자 대상
- **장점**: 높은 신뢰도, 안정적인 API, 풍부한 사용자 정보
- **제공 정보**: 이름, 이메일, 프로필 사진, 구글 ID

### 2. Kakao OAuth2
- **사용자층**: 한국 사용자 대상 (90% 이상 보급률)
- **장점**: 한국 시장 특화, 간편한 인증 플로우
- **제공 정보**: 카카오계정 이름, 이메일, 프로필 사진

### 3. Naver OAuth2
- **사용자층**: 한국 사용자 대상
- **장점**: 네이버 생태계 연동, 추가 서비스 활용 가능
- **제공 정보**: 이름, 이메일, 프로필 사진, 연령대, 성별

## 파일 구조

### 백엔드 OAuth2 설정
```
src/main/java/backend/fitmate/
├── config/
│   ├── SecurityConfig.java           # Spring Security OAuth2 설정
│   ├── OAuth2Config.java            # OAuth2 클라이언트 설정
│   └── OAuth2AuthenticationSuccessHandler.java  # 인증 성공 핸들러
├── oauth/
│   ├── CustomOAuth2UserService.java # OAuth2 사용자 정보 처리
│   ├── OAuth2UserInfo.java          # 사용자 정보 인터페이스
│   ├── GoogleOAuth2UserInfo.java    # Google 사용자 정보
│   ├── KakaoOAuth2UserInfo.java     # Kakao 사용자 정보
│   └── NaverOAuth2UserInfo.java     # Naver 사용자 정보
└── User/
    ├── entity/User.java             # 사용자 엔티티 (OAuth2 필드 포함)
    └── service/UserService.java     # 사용자 서비스 (OAuth2 연동)
```

### 프론트엔드 OAuth2 처리
```
frontend/src/
├── components/
│   └── SignupForm.tsx               # 소셜 로그인 버튼
├── utils/
│   └── oauthHelper.ts               # OAuth2 헬퍼 함수
└── config/
    └── api.ts                       # OAuth2 엔드포인트 설정
```

## OAuth2 인증 플로우

### 1. 사용자 소셜 로그인 시작
1. 사용자가 소셜 로그인 버튼 클릭
2. Frontend에서 백엔드 OAuth2 엔드포인트로 리다이렉트
3. 백엔드에서 해당 프로바이더 인증 URL로 리다이렉트

### 2. 프로바이더 인증
```
사용자 → Google/Kakao/Naver 로그인 → 인증 코드 발급 → 백엔드 콜백
```

### 3. 백엔드 인증 처리
1. 인증 코드로 액세스 토큰 요청
2. 액세스 토큰으로 사용자 정보 조회
3. 사용자 정보 검증 및 가공
4. 기존 사용자 확인 또는 신규 사용자 생성
5. JWT 토큰 생성 및 응답

### 4. 프론트엔드 인증 완료
1. JWT 토큰 localStorage 저장
2. 사용자 상태 업데이트
3. 온보딩 또는 대시보드로 리다이렉트

## 주요 코드 분석

### SecurityConfig.java - OAuth2 설정
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Autowired
    private CustomOAuth2UserService customOAuth2UserService;
    
    @Autowired
    private OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(customOAuth2UserService)
                )
                .successHandler(oAuth2AuthenticationSuccessHandler)
                .failureUrl("/login?error=oauth2")
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .anyRequest().authenticated()
            );
        
        return http.build();
    }
}
```

### CustomOAuth2UserService.java - 사용자 정보 처리
```java
@Service
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {
    
    @Autowired
    private UserService userService;
    
    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);
        
        // 프로바이더 정보 추출
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String userNameAttributeName = userRequest.getClientRegistration()
                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();
        
        // 프로바이더별 사용자 정보 추출
        OAuth2UserInfo oAuth2UserInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(registrationId, oAuth2User.getAttributes());
        
        // 사용자 생성 또는 업데이트
        User user = createOrUpdateUser(oAuth2UserInfo, registrationId);
        
        return new CustomOAuth2User(user, oAuth2User.getAttributes(), userNameAttributeName);
    }
    
    private User createOrUpdateUser(OAuth2UserInfo oAuth2UserInfo, String provider) {
        User existingUser = userService.findByEmailAndProvider(oAuth2UserInfo.getEmail(), provider);
        
        if (existingUser != null) {
            // 기존 사용자 정보 업데이트
            return updateExistingUser(existingUser, oAuth2UserInfo);
        } else {
            // 신규 사용자 생성
            return createNewUser(oAuth2UserInfo, provider);
        }
    }
}
```

### OAuth2UserInfoFactory.java - 프로바이더별 사용자 정보 팩토리
```java
public class OAuth2UserInfoFactory {
    
    public static OAuth2UserInfo getOAuth2UserInfo(String registrationId, Map<String, Object> attributes) {
        switch (registrationId.toLowerCase()) {
            case "google":
                return new GoogleOAuth2UserInfo(attributes);
            case "kakao":
                return new KakaoOAuth2UserInfo(attributes);
            case "naver":
                return new NaverOAuth2UserInfo(attributes);
            default:
                throw new OAuth2AuthenticationProcessingException("Login with " + registrationId + " is not supported");
        }
    }
}
```

### GoogleOAuth2UserInfo.java - Google 사용자 정보 추출
```java
public class GoogleOAuth2UserInfo implements OAuth2UserInfo {
    private Map<String, Object> attributes;
    
    public GoogleOAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }
    
    @Override
    public String getId() {
        return (String) attributes.get("sub");
    }
    
    @Override
    public String getName() {
        return (String) attributes.get("name");
    }
    
    @Override
    public String getEmail() {
        return (String) attributes.get("email");
    }
    
    @Override
    public String getImageUrl() {
        return (String) attributes.get("picture");
    }
}
```

### KakaoOAuth2UserInfo.java - Kakao 사용자 정보 추출
```java
public class KakaoOAuth2UserInfo implements OAuth2UserInfo {
    private Map<String, Object> attributes;
    
    public KakaoOAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }
    
    @Override
    public String getId() {
        return String.valueOf(attributes.get("id"));
    }
    
    @Override
    public String getName() {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
        return (String) profile.get("nickname");
    }
    
    @Override
    public String getEmail() {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        return (String) kakaoAccount.get("email");
    }
    
    @Override
    public String getImageUrl() {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
        return (String) profile.get("profile_image_url");
    }
}
```

### OAuth2AuthenticationSuccessHandler.java - 인증 성공 핸들러
```java
@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, 
                                      Authentication authentication) throws IOException {
        
        CustomOAuth2User oAuth2User = (CustomOAuth2User) authentication.getPrincipal();
        
        // JWT 토큰 생성
        String token = jwtTokenProvider.createToken(oAuth2User.getEmail());
        
        // 온보딩 완료 여부 확인
        boolean onboardingCompleted = oAuth2User.getUser().isOnboardingCompleted();
        
        // 리다이렉트 URL 구성
        String redirectUrl = onboardingCompleted ? 
            "http://localhost:5173/dashboard?token=" + token :
            "http://localhost:5173/onboarding?token=" + token;
        
        response.sendRedirect(redirectUrl);
    }
}
```

### 프론트엔드 - 소셜 로그인 버튼
```typescript
// SignupForm.tsx
const handleSocialLogin = (provider: string) => {
  // OAuth2 인증 시작
  window.location.href = `${API_BASE_URL}/oauth2/authorization/${provider}`;
};

return (
  <div className="social-login-buttons">
    <button 
      onClick={() => handleSocialLogin('google')}
      className="social-button google"
    >
      <GoogleIcon />
      Google로 시작하기
    </button>
    
    <button 
      onClick={() => handleSocialLogin('kakao')}
      className="social-button kakao"
    >
      <KakaoIcon />
      카카오로 시작하기
    </button>
    
    <button 
      onClick={() => handleSocialLogin('naver')}
      className="social-button naver"
    >
      <NaverIcon />
      네이버로 시작하기
    </button>
  </div>
);
```

### OAuth2 토큰 처리 - oauthHelper.ts
```typescript
export const handleOAuth2Response = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const error = urlParams.get('error');
  
  if (error) {
    console.error('OAuth2 인증 실패:', error);
    return false;
  }
  
  if (token) {
    localStorage.setItem('token', token);
    // URL에서 토큰 제거
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }
  
  return false;
};

export const getProviderInfo = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      provider: payload.provider || 'unknown',
      email: payload.sub,
      name: payload.name
    };
  } catch (error) {
    return null;
  }
};
```

## 데이터베이스 스키마

### User 테이블 OAuth2 필드
```sql
ALTER TABLE users ADD COLUMN (
    provider VARCHAR(50) DEFAULT 'local',           -- 'local', 'google', 'kakao', 'naver'
    provider_id VARCHAR(255),                       -- 프로바이더별 고유 ID
    picture VARCHAR(500),                           -- 프로필 이미지 URL
    oauth2_connected_at TIMESTAMP,                  -- OAuth2 연동 시간
    oauth2_last_login TIMESTAMP                     -- OAuth2 마지막 로그인
);

-- 복합 인덱스 생성
CREATE INDEX idx_user_provider ON users(email, provider);
CREATE INDEX idx_user_provider_id ON users(provider, provider_id);
```

## 보안 고려사항

### 1. CSRF 보호
```java
// SecurityConfig.java
.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
    .ignoringRequestMatchers("/oauth2/**")
)
```

### 2. 세션 관리
```java
.sessionManagement(session -> session
    .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
    .maximumSessions(1)
    .maxSessionsPreventsLogin(false)
)
```

### 3. 리다이렉트 URL 검증
```java
@Component
public class OAuth2AuthenticationSuccessHandler {
    
    private final List<String> ALLOWED_REDIRECT_URLS = Arrays.asList(
        "http://localhost:5173",
        "https://fitmate.example.com"
    );
    
    private boolean isAuthorizedRedirectUri(String uri) {
        return ALLOWED_REDIRECT_URLS.stream()
                .anyMatch(authorizedRedirectUri -> uri.startsWith(authorizedRedirectUri));
    }
}
```

### 4. 사용자 정보 검증
```java
private void validateOAuth2UserInfo(OAuth2UserInfo userInfo) {
    if (userInfo.getEmail() == null || userInfo.getEmail().isEmpty()) {
        throw new OAuth2AuthenticationProcessingException("Email not found from OAuth2 provider");
    }
    
    if (userInfo.getName() == null || userInfo.getName().isEmpty()) {
        throw new OAuth2AuthenticationProcessingException("Name not found from OAuth2 provider");
    }
}
```

## 에러 처리

### OAuth2 인증 실패 처리
```java
@ControllerAdvice
public class OAuth2ExceptionHandler {
    
    @ExceptionHandler(OAuth2AuthenticationException.class)
    public ResponseEntity<String> handleOAuth2Exception(OAuth2AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("OAuth2 인증에 실패했습니다: " + ex.getMessage());
    }
}
```

### 프론트엔드 에러 처리
```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  
  if (error === 'oauth2') {
    setErrorMessage('소셜 로그인에 실패했습니다. 다시 시도해주세요.');
  }
}, []);
```

## 성능 최적화

### 1. 사용자 정보 캐싱
```java
@Service
@Transactional
public class UserService {
    
    @Cacheable(value = "oauth2Users", key = "#email + '_' + #provider")
    public User findByEmailAndProvider(String email, String provider) {
        return userRepository.findByEmailAndProvider(email, provider);
    }
}
```

### 2. 프로바이더별 최적화
- **Google**: 추가 스코프 최소화로 인증 속도 향상
- **Kakao**: 카카오계정 정보 동의항목 최적화
- **Naver**: 필수 정보만 요청하여 사용자 이탈 방지

## 면접 예상 질문 대비

### Q1: OAuth2와 JWT를 함께 사용하는 이유는?
**A:** 
- **OAuth2**: 외부 프로바이더 인증으로 사용자 편의성 제공
- **JWT**: 내부 서비스 인증으로 성능과 확장성 확보
- **하이브리드**: 소셜 로그인 후 자체 토큰 시스템으로 일관된 인증 관리

### Q2: 프로바이더별로 다른 사용자 정보 구조를 어떻게 처리했나요?
**A:**
- **팩토리 패턴**: OAuth2UserInfoFactory로 프로바이더별 구현체 생성
- **인터페이스 통일**: OAuth2UserInfo 인터페이스로 일관된 데이터 접근
- **데이터 매핑**: 각 프로바이더의 JSON 구조에 맞는 추출 로직

### Q3: 동일한 이메일로 다른 프로바이더 로그인 시 어떻게 처리하나요?
**A:**
- **복합키 사용**: email + provider로 사용자 구분
- **계정 연동**: 사용자 선택에 따라 기존 계정과 연동 가능
- **중복 방지**: 프로바이더별 독립적인 사용자 관리

### Q4: OAuth2 인증 실패 시 보안 고려사항은?
**A:**
- **에러 정보 최소화**: 상세한 에러 정보 노출 방지
- **재시도 제한**: Rate Limiting으로 무차별 시도 방지
- **로그 모니터링**: 실패 패턴 분석으로 보안 위협 탐지

## 향후 개선 방향

### 1. 추가 프로바이더 지원
- **Apple ID**: iOS 사용자 편의성
- **Facebook**: 글로벌 사용자 확장
- **GitHub**: 개발자 커뮤니티 타겟

### 2. 계정 연동 기능
- **다중 프로바이더**: 하나의 계정에 여러 프로바이더 연동
- **프로바이더 전환**: 기존 데이터 유지하며 프로바이더 변경
- **연동 해제**: 안전한 OAuth2 연동 해제

### 3. 고급 보안 기능
- **2FA 연동**: 프로바이더 2FA와 연동
- **권한 세분화**: 스코프별 권한 관리
- **세션 관리**: 다중 디바이스 세션 통합 관리

---

*이 문서는 FitMate 프로젝트의 OAuth2 소셜 로그인 시스템에 대한 상세 분석을 제공합니다.*