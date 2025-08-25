# FitMate 인증 시스템 플로우 차트

## 📋 플로우 개요
FitMate의 인증 시스템은 **로컬 회원가입/로그인**, **소셜 로그인**, **온보딩**, **캘린더 연결**의 4가지 주요 플로우로 구성됩니다.

---

## 🔐 1. 로컬 회원가입 플로우

### [1단계] 사용자 입력 및 검증
**파일**: `frontend/src/features/authentication/components/SignupForm.tsx`

```typescript
const handleSignup = async () => {
  // 폼 검증 실행 - 모든 필드의 유효성을 한 번에 체크
  const formErrors = validateForm();
  setErrors(formErrors);
  
  // 검증 통과 시에만 API 호출 진행
  if (Object.keys(formErrors).length === 0) {
    // 회원가입 API 호출
    const response = await apiClient.post(API_ENDPOINTS.SIGNUP, formData);
    // 성공 처리
  }
};
```

**설명**: 
- `validateForm()`: 폼의 모든 입력값을 검증하는 중앙 검증 함수
- `Object.keys(formErrors).length === 0`: 에러 객체에 속성이 없으면 검증 통과
- 사용자가 이메일, 비밀번호, 닉네임, 이름, 생년월일, 성별, 휴대전화번호를 입력하면, 프론트엔드에서 기본 유효성 검사를 수행

#### **개별 검증 함수들**
```typescript
// 이메일 검증: 빈 값 체크 + 이메일 형식 정규식 검증
const validateEmail = (email: string): string | undefined => {
  if (!email) return '이메일을 입력해주세요';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return '올바른 이메일 형식을 입력해주세요';
  return undefined;  // undefined = 검증 성공
};

// 비밀번호 검증: 빈 값 체크 + 8자 이상 + 영문+숫자 포함
const validatePassword = (password: string): string | undefined => {
  if (!password) return '비밀번호를 입력해주세요';
  if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다';
  if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
    return '비밀번호는 영문과 숫자를 포함해야 합니다';
  }
  return undefined;  // undefined = 검증 성공
};

// 이름 검증: 빈 값 체크 + 2자 이상
const validateName = (name: string): string | undefined => {
  if (!name) return '이름을 입력해주세요';
  if (name.length < 2) return '이름은 2자 이상이어야 합니다';
  return undefined;
};

// 생년월일 검증: 8자리 + 숫자만 + 유효한 날짜
const validateBirthDate = (birthDate: string): string | undefined => {
  if (!birthDate) return '생년월일을 입력해주세요';
  if (birthDate.length !== 8) return '생년월일은 8자리로 입력해주세요';
  if (!/^\d{8}$/.test(birthDate)) return '생년월일은 숫자로만 입력해주세요';
  
  // 년/월/일 유효성 검사
  const year = parseInt(birthDate.substring(0, 4));
  const month = parseInt(birthDate.substring(4, 6));
  const day = parseInt(birthDate.substring(6, 8));
  
  if (year < 1900 || year > new Date().getFullYear()) return '올바른 년도를 입력해주세요';
  if (month < 1 || month > 12) return '올바른 월을 입력해주세요';
  if (day < 1 || day > 31) return '올바른 일을 입력해주세요';
  
  return undefined;
};

// 전화번호 검증: 010-XXXX-XXXX 형식
const validatePhoneNumber = (phoneNumber: string): string | undefined => {
  if (!phoneNumber) return '휴대전화번호를 입력해주세요';
  const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return '올바른 휴대전화번호 형식을 입력해주세요 (예: 010-1234-5678)';
  }
  return undefined;
};
```

### [2단계] 백엔드 회원가입 처리
**파일**: `src/main/java/backend/fitmate/controller/AuthController.java`

```java
@PostMapping("/signup")
@RateLimit(bucketName = "signupBucket", keyType = RateLimit.KeyType.IP)  // IP 기반 회원가입 제한
public ResponseEntity<?> signup(@RequestBody Map<String, String> signupRequest) {
    // 요청 데이터 추출
    String email = signupRequest.get("email");
    String password = signupRequest.get("password");
    String nickname = signupRequest.get("nickname");
    String name = signupRequest.get("name");
    String birthDate = signupRequest.get("birthDate");
    String gender = signupRequest.get("gender");
    String phoneNumber = signupRequest.get("phoneNumber");
    String goal = signupRequest.get("goal"); // 운동 목표 추가
    
    // 필수 필드 검증 (백엔드에서 한 번 더 검증)
    if (email == null || email.trim().isEmpty()) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "이메일을 입력해주세요.");
        return ResponseEntity.badRequest().body(response);
    }
    
    // ... 다른 필드들도 동일하게 검증
    
    try {
        // UserService를 통해 실제 회원가입 처리
        User user = userService.signup(email, password, nickname, name, birthDate, gender, phoneNumber, goal);
        
        // JWT 토큰 생성
        String token = jwtTokenProvider.createToken(
            user.getId(), user.getEmail(), user.getName(),
            user.getOauthProvider(), user.getOauthId(), 
            user.getProfileImage(), user.getRole()
        );
        
        // 성공 응답 반환
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "회원가입이 완료되었습니다.");
        response.put("token", token);  // JWT 토큰 포함
        response.put("user", Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "name", user.getName(),
            "nickname", user.getNickname() != null ? user.getNickname() : "",
            "birthDate", user.getBirthDate(),
            "gender", user.getGender() != null ? user.getGender() : "",
            "phoneNumber", user.getPhoneNumber(),
            "goal", user.getGoal() != null ? user.getGoal() : "general",
            "emailVerified", user.isEmailVerified()
        ));
        
        return ResponseEntity.ok(response);
    } catch (RuntimeException e) {
        // 비즈니스 로직 에러 (중복 이메일, 닉네임 등)
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", e.getMessage());
        return ResponseEntity.badRequest().body(response);
    } catch (Exception e) {
        // 시스템 에러
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "회원가입 처리 중 오류가 발생했습니다.");
        return ResponseEntity.internalServerError().body(response);
    }
}
```

**설명**: 
- `@PostMapping("/signup")`: HTTP POST 요청을 `/api/auth/signup` 경로로 매핑
- `@RateLimit`: IP 기반으로 회원가입 요청을 제한하여 스팸 방지
- 백엔드에서도 필수 필드 검증을 한 번 더 수행 (보안 강화)
- `userService.signup()`: 실제 비즈니스 로직 처리
- `jwtTokenProvider.createToken()`: JWT 토큰 생성하여 즉시 로그인 상태로 전환

**파일**: `src/main/java/backend/fitmate/User/service/UserService.java`

```java
/**
 * 사용자 회원가입
 */
public User signup(String email, String password, String nickname, 
                  String name, String birthDate, String gender, String phoneNumber, String goal) {
    
    // 닉네임 중복 확인 (닉네임이 있는 경우)
    if (nickname != null && !nickname.trim().isEmpty() && isNicknameExists(nickname)) {
        throw new RuntimeException("이미 존재하는 닉네임입니다.");
    }
    
    // 휴대전화번호 중복 확인
    if (isPhoneNumberExists(phoneNumber)) {
        throw new RuntimeException("이미 존재하는 휴대전화번호입니다.");
    }
    
    // 비밀번호 암호화 (BCrypt 사용)
    String encodedPassword = passwordEncoder.encode(password);
    
    // 사용자 엔티티 생성
    User user = new User();
    user.setEmail(email);
    user.setPassword(encodedPassword);
    user.setNickname(nickname);
    user.setName(name);
    user.setBirthDate(birthDate);
    user.setGender(gender);
    user.setPhoneNumber(phoneNumber);
    user.setGoal(goal); // 운동 목표 설정
    user.setEmailVerified(false);  // 이메일 인증은 나중에
    
    // 데이터베이스에 저장
    return userRepository.save(user);
}
```

**설명**: 
- `isNicknameExists()`, `isPhoneNumberExists()`: 중복 데이터 검사
- `passwordEncoder.encode()`: BCrypt로 비밀번호 해시화
- `userRepository.save()`: JPA를 통해 데이터베이스에 저장

### [3단계] 프론트엔드 응답 처리
**파일**: `frontend/src/features/authentication/components/SignupForm.tsx`

```typescript
if (data.success) {
  showModal('회원가입 완료', '회원가입이 완료되었습니다!', 'success');

  // 온보딩 상태 초기화 및 로컬 가입 플래그 설정
  try {
    localStorage.setItem('justSignedUp', 'true');        // 방금 회원가입했다는 플래그
    localStorage.setItem('currentProvider', 'local');    // 로컬 회원가입 표시
    localStorage.removeItem('onboardingCompleted');      // 온보딩 완료 플래그 제거
    
    // 프로바이더별 온보딩 완료 플래그도 모두 제거
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('onboardingCompleted_')) {
        localStorage.removeItem(key);
      }
    });
  } catch {}

  // 로그인 페이지로 이동 (1.5초 후)
  setTimeout(() => {
    window.location.href = '/login';
  }, 1500);
} else {
  showModal('회원가입 실패', data.message || '회원가입에 실패했습니다.', 'error');
}
```

**설명**: 
- `localStorage.setItem('justSignedUp', 'true')`: 회원가입 직후 상태를 기억
- `localStorage.setItem('currentProvider', 'local')`: 로컬 회원가입임을 표시
- 온보딩 관련 플래그들을 모두 초기화하여 새 사용자 경험 제공
- `setTimeout()`: 사용자가 성공 메시지를 볼 수 있도록 1.5초 대기 후 리다이렉트

---

## 🔑 2. 로컬 로그인 플로우

### [1단계] 사용자 인증 정보 입력
**파일**: `frontend/src/features/authentication/components/MemberForm.tsx`

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();  // 폼 기본 동작 방지
  
  if (!email || !password) {
    showModal('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.', 'error');
    return;
  }

  try {
    // 로그인 API 호출
    const response = await apiClient.post(API_ENDPOINTS.LOGIN, {
      email: email,
      password: password
    });
    
    // 응답 처리...
  } catch (error) {
    // 에러 처리...
  }
};
```

**설명**: 
- `e.preventDefault()`: 폼 제출 시 페이지 새로고침 방지
- 프론트엔드에서 기본적인 입력값 검증
- `apiClient.post()`: 백엔드의 `/api/auth/login` 엔드포인트로 인증 요청

### [2단계] 백엔드 인증 처리
**파일**: `src/main/java/backend/fitmate/controller/AuthController.java`

```java
@PostMapping("/login")
@RateLimit(bucketName = "loginBucket", keyType = RateLimit.KeyType.IP)  // IP 기반 로그인 제한
public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
    String email = loginRequest.get("email");
    String password = loginRequest.get("password");
    
    // 필수 필드 검증
    if (email == null || email.trim().isEmpty()) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "이메일을 입력해주세요.");
        return ResponseEntity.badRequest().body(response);
    }
    
    if (password == null || password.trim().isEmpty()) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "비밀번호를 입력해주세요.");
        return ResponseEntity.badRequest().body(response);
    }
    
    try {
        // 사용자 조회
        Optional<User> userOpt = userService.findByEmail(email);
        if (!userOpt.isPresent()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "존재하지 않는 이메일입니다.");
            return ResponseEntity.badRequest().body(response);
        }
        
        User user = userOpt.get();
        
        // 비밀번호 검증 (OAuth2 사용자는 비밀번호가 없을 수 있음)
        if (user.getPassword() == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "소셜 로그인으로 가입한 계정입니다.");
            return ResponseEntity.badRequest().body(response);
        }
        
        // BCrypt로 비밀번호 검증
        if (!passwordEncoder.matches(password, user.getPassword())) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "비밀번호가 일치하지 않습니다.");
            return ResponseEntity.badRequest().body(response);
        }
        
        // JWT 토큰 생성 (일반 로그인은 provider를 "local"로 설정)
        String token = jwtTokenProvider.createToken(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getOauthProvider(),
            user.getOauthId(),
            user.getProfileImage(),
            user.getRole()
        );
        
        // 성공 응답 반환
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "로그인 성공");
        response.put("token", token);
        response.put("user", Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "name", user.getName(),
            "nickname", user.getNickname() != null ? user.getNickname() : "",
            "birthDate", user.getBirthDate(),
            "gender", user.getGender() != null ? user.getGender() : "",
            "phoneNumber", user.getPhoneNumber(),
            "goal", user.getGoal() != null ? user.getGoal() : "general",
            "emailVerified", user.isEmailVerified()
        ));
        
        return ResponseEntity.ok(response);
    } catch (Exception e) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "로그인 처리 중 오류가 발생했습니다.");
        return ResponseEntity.internalServerError().body(response);
    }
}
```

**설명**: 
- `@RateLimit`: 무차별 대입 공격 방지를 위한 로그인 시도 제한
- `userService.findByEmail()`: 이메일로 사용자 조회
- `passwordEncoder.matches()`: BCrypt로 입력된 비밀번호와 저장된 해시 비교
- OAuth2 사용자 체크: 소셜 로그인으로 가입한 계정은 비밀번호가 없음
- `jwtTokenProvider.createToken()`: 인증 성공 시 JWT 토큰 생성

### [3단계] 프론트엔드 응답 처리
**파일**: `frontend/src/features/authentication/components/MemberForm.tsx`

```typescript
if (response.data.success) {
  // JWT 토큰을 localStorage에 저장
  localStorage.setItem('token', response.data.token);
  
  // 사용자 정보를 localStorage에 저장 (선택사항)
  if (response.data.user) {
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  // UserContext에 사용자 정보 설정
  if (response.data.user) {
    setUserFromLogin(response.data.user, response.data.token);
  }
  
  showModal('로그인 성공', '로그인에 성공했습니다!', 'success');
  
  // 2초 후 대시보드로 이동
  setTimeout(() => {
    navigate('/'); // 스프링부트에서 redirect:/dashboard 와 유사
  }, 1000);
} else {
  showModal('로그인 실패', response.data.message || '이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
}
```

**설명**: 
- `localStorage.setItem('token', response.data.token)`: JWT 토큰을 브라우저에 저장
- `setUserFromLogin()`: UserContext를 통해 전역 사용자 상태 업데이트
- `navigate('/')`: React Router를 사용하여 대시보드로 이동
- `setTimeout()`: 사용자가 성공 메시지를 볼 수 있도록 1초 대기

---

## 🌐 4. 소셜 로그인 플로우 (Google)

### [1단계] OAuth2 인증 시작
**파일**: `frontend/src/features/authentication/components/MemberForm.tsx`

```typescript
const handleSocialLogin = async (provider: string) => {
  try {
    // OAuth2 인증 URL로 리다이렉트
    window.location.href = API_ENDPOINTS.OAUTH2_AUTHORIZATION(provider);
  } catch (error) {
    console.error('소셜 로그인 시작 실패:', error);
    showModal('로그인 실패', '소셜 로그인을 시작할 수 없습니다.', 'error');
  }
};

// 소셜 로그인 버튼들
<div className="social-login-buttons">
  <button 
    type="button" 
    className="social-login-btn google"
    onClick={() => handleSocialLogin('google')}
  >
    <img src="/images/Google_Login_Btn.png" alt="Google 로그인" />
  </button>
  
  <button 
    type="button" 
    className="social-login-btn kakao"
    onClick={() => handleSocialLogin('kakao')}
  >
    <img src="/images/Kakao_Login_Btn.png" alt="Kakao 로그인" />
  </button>
  
  <button 
    type="button" 
    className="social-login-btn naver"
    onClick={() => handleSocialLogin('naver')}
  >
    <img src="/images/Naver_Login_Btn.png" alt="Naver 로그인" />
  </button>
</div>
```

**설명**: 
- `handleSocialLogin(provider)`: 소셜 로그인 제공자(google, kakao, naver)를 매개변수로 받음
- `API_ENDPOINTS.OAUTH2_AUTHORIZATION(provider)`: 백엔드의 OAuth2 인증 시작 경로 생성
- `window.location.href`: 브라우저를 백엔드의 `/oauth2/authorization/{provider}` 경로로 리다이렉트
- 각 소셜 로그인 버튼은 고유한 이미지와 스타일을 가짐

### [2단계] Google OAuth2 처리
**파일**: `src/main/java/backend/fitmate/config/CustomOAuth2UserService.java`

```java
@Component
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    
    private final UserService userService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final HttpServletRequest request;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 기본 OAuth2 사용자 정보 로드
        OAuth2User oauth2User = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        
        System.out.println("🔀 [CustomOAuth2UserService] registrationId=" + registrationId);
        
        // 캘린더 연동 사용자 ID 복구 시도
        Long calendarLinkingUserId = null;
        try {
            // 1) 세션에서 확인
            jakarta.servlet.http.HttpSession ses = request.getSession(false);
            if (ses != null) {
                Object marker = ses.getAttribute("calendar_linking_active");
                Object uid = ses.getAttribute("calendar_linking_user_id");
                if (Boolean.TRUE.equals(marker) && uid != null) {
                    calendarLinkingUserId = Long.parseLong(String.valueOf(uid));
                    System.out.println("✅ 세션으로 캘린더 연동 사용자 확인: userId=" + calendarLinkingUserId);
                }
                
                // 1.5) Redis 세션 매핑으로 확인
                if (calendarLinkingUserId == null) {
                    String key = "calendar_session:" + ses.getId();
                    Object val = redisTemplate.opsForValue().get(key);
                    if (val != null) {
                        calendarLinkingUserId = Long.parseLong(String.valueOf(val));
                        System.out.println("✅ Redis 세션 매핑으로 캘린더 연동 사용자 확인: userId=" + calendarLinkingUserId);
                    }
                }
            }

            // 1.5) HttpOnly 쿠키 보조 확인
            if (calendarLinkingUserId == null && request.getCookies() != null) {
                for (jakarta.servlet.http.Cookie c : request.getCookies()) {
                    if ("calendar_link_uid".equals(c.getName())) {
                        try { 
                            calendarLinkingUserId = Long.parseLong(c.getValue()); 
                            System.out.println("✅ 쿠키로 캘린더 연동 사용자 확인: userId=" + calendarLinkingUserId);
                            break;
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }

            // 2) 하위 호환: state 파라미터 기반 (이전 방식)
            if (calendarLinkingUserId == null) {
                String state = request.getParameter("state");
                System.out.println("[CAL-LINK][STATE] " + state);
                if (state != null && !state.isBlank()) {
                    String stateKey = "oauth_state:" + state;
                    Object mappedUserId = redisTemplate.opsForValue().get(stateKey);
                    System.out.println("🛂 Redis 조회 결과 for key '" + stateKey + "': " + mappedUserId);
                    if (mappedUserId != null) {
                        calendarLinkingUserId = Long.parseLong(String.valueOf(mappedUserId));
                        redisTemplate.delete(stateKey); // 일회성 사용 후 즉시 삭제
                        System.out.println("✅ Redis state 매핑으로 캘린더 연동 사용자 확인: userId=" + calendarLinkingUserId);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("🚨 캘린더 연동 사용자 식별 중 오류: " + e.getMessage());
        }

        // 캘린더 연동 사용자가 확인된 경우 (google-connect 전용 registration)
        if (calendarLinkingUserId != null && ("google-connect".equals(registrationId) || "google".equals(registrationId))) {
            try {
                String googleOauthId = oauth2User.getAttribute("sub");
                String googleEmail = oauth2User.getAttribute("email");
                String googleName = oauth2User.getAttribute("name");
                String googlePicture = oauth2User.getAttribute("picture");

                System.out.println("[CAL-LINK][LINK] userId=" + calendarLinkingUserId + ", email=" + googleEmail + ", name=" + googleName + ", sub=" + googleOauthId);
                
                // 기존 사용자에 Google 정보 추가 (신규 사용자 생성 방지)
                User updatedUser = userService.addGoogleCalendarInfoByUserId(
                    calendarLinkingUserId, googleEmail, googleName, googlePicture, googleOauthId);

                System.out.println("[CAL-LINK][LINK-DONE] updatedUserId=" + updatedUser.getId());
                
                // OAuth2User에 추가 정보 설정
                Map<String, Object> attributes = new HashMap<>(oauth2User.getAttributes());
                attributes.put("provider", "google-connect");
                attributes.put("userId", updatedUser.getId().toString());
                attributes.put("calendarLinking", true);
                String nameAttributeKey = "sub";

                return new DefaultOAuth2User(oauth2User.getAuthorities(), attributes, nameAttributeKey);
            } catch (Exception e) {
                System.err.println("🚨 캘린더 연동 처리 실패: " + e.getMessage());
                e.printStackTrace();
                throw new OAuth2AuthenticationException("캘린더 연동 처리 중 오류가 발생했습니다: " + e.getMessage());
            }
        }

        // 일반 소셜 로그인 분기
        System.out.println("🔀 [CustomOAuth2UserService] 일반 소셜 로그인 분기 실행");
        switch (registrationId) {
            case "google":
                String email = oauth2User.getAttribute("email");
                String name = oauth2User.getAttribute("name");
                String picture = oauth2User.getAttribute("picture");
                String oauthId = oauth2User.getAttribute("sub");
                
                System.out.println("🔀 [CustomOAuth2UserService] Google 사용자 정보: email=" + email + ", name=" + name + ", sub=" + oauthId);
                
                // UserService를 통해 사용자 저장/업데이트
                User user = userService.saveOrUpdateOAuth2User(email, name, picture, registrationId, oauthId);
                
                // OAuth2User에 추가 정보 설정
                Map<String, Object> attributes = new HashMap<>(oauth2User.getAttributes());
                attributes.put("provider", registrationId);
                attributes.put("oauthId", oauthId);
                attributes.put("userId", user.getId().toString());
                String nameAttributeKey = "sub";

                return new DefaultOAuth2User(oauth2User.getAuthorities(), attributes, nameAttributeKey);
                
            case "kakao":
                // Kakao 로그인 처리
                String kakaoEmail = oauth2User.getAttribute("email");
                String kakaoName = oauth2User.getAttribute("name");
                String kakaoPicture = oauth2User.getAttribute("picture");
                String kakaoOauthId = oauth2User.getAttribute("id");
                
                User kakaoUser = userService.saveOrUpdateOAuth2User(kakaoEmail, kakaoName, kakaoPicture, registrationId, kakaoOauthId);
                
                Map<String, Object> kakaoAttributes = new HashMap<>(oauth2User.getAttributes());
                kakaoAttributes.put("provider", registrationId);
                kakaoAttributes.put("oauthId", kakaoOauthId);
                kakaoAttributes.put("userId", kakaoUser.getId().toString());
                
                return new DefaultOAuth2User(oauth2User.getAuthorities(), kakaoAttributes, "id");
                
            case "naver":
                // Naver 로그인 처리
                String naverEmail = oauth2User.getAttribute("email");
                String naverName = oauth2User.getAttribute("name");
                String naverPicture = oauth2User.getAttribute("picture");
                String naverOauthId = oauth2User.getAttribute("id");
                
                User naverUser = userService.saveOrUpdateOAuth2User(naverEmail, naverName, naverPicture, registrationId, naverOauthId);
                
                Map<String, Object> naverAttributes = new HashMap<>(oauth2User.getAttributes());
                naverAttributes.put("provider", registrationId);
                naverAttributes.put("oauthId", naverOauthId);
                naverAttributes.put("userId", naverUser.getId().toString());
                
                return new DefaultOAuth2User(oauth2User.getAuthorities(), naverAttributes, "id");
                
            default:
                throw new RuntimeException("지원하지 않는 OAuth2 제공자입니다: " + registrationId);
        }
    }
}
```

**설명**: 
- `CustomOAuth2UserService`: OAuth2 인증 후 사용자 정보를 처리하는 커스텀 서비스
- `loadUser()`: OAuth2 인증 성공 후 호출되는 핵심 메소드
- 캘린더 연동 사용자 ID 복구: 세션, Redis, 쿠키, state 순서로 복구 시도
- `userService.saveOrUpdateOAuth2User()`: 기존 사용자인지 확인하고 없으면 신규 사용자 생성
- 각 소셜 로그인 제공자별로 다른 처리 로직 적용
- OAuth2User에 추가 정보(provider, oauthId, userId) 설정

### [3단계] 로그인 성공 처리
**파일**: `src/main/java/backend/fitmate/config/SecurityConfig.java`

```java
// ⭐ 통합 OAuth2 로그인 성공 핸들러
private AuthenticationSuccessHandler loginSuccessHandler() {
    return (request, response, authentication) -> {
        try {
            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
            String registrationId = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();
            Map<String, Object> attributes = oAuth2User.getAttributes();

            // 캘린더 연동인지 일반 소셜 로그인인지 판단
            boolean isCalendarLink = "google-connect".equals(registrationId) || oAuth2User.getAttribute("calendarLinking") != null;

            System.err.println("[CAL-LINK][SUCCESS] provider=" + registrationId + ", calendarLink=" + isCalendarLink);
            System.err.println("[CAL-LINK][SUCCESS] attrsKeys=" + attributes.keySet());

            // 폴백: userId 속성이 없으면 세션/Redis/쿠키/state로 복구 시도
            Long recoveredUserId = null;
            if (attributes.get("userId") == null) {
                try {
                    jakarta.servlet.http.HttpSession ses = request.getSession(false);
                    if (ses != null) {
                        Object marker = ses.getAttribute("calendar_linking_active");
                        Object uid = ses.getAttribute("calendar_linking_user_id");
                        if (Boolean.TRUE.equals(marker) && uid != null) {
                            recoveredUserId = Long.parseLong(String.valueOf(uid));
                            System.err.println("[CAL-LINK][RECOVER] session userId=" + recoveredUserId);
                        }
                        if (recoveredUserId == null) {
                            String key = "calendar_session:" + ses.getId();
                            Object val = redisTemplate.opsForValue().get(key);
                            if (val != null) {
                                recoveredUserId = Long.parseLong(String.valueOf(val));
                                System.err.println("[CAL-LINK][RECOVER] redis session userId=" + recoveredUserId);
                            }
                        }
                    }
                    if (recoveredUserId == null && request.getCookies() != null) {
                        for (jakarta.servlet.http.Cookie c : request.getCookies()) {
                            if ("calendar_link_uid".equals(c.getName())) {
                                try { 
                                    recoveredUserId = Long.parseLong(c.getValue()); 
                                    System.err.println("[CAL-LINK][RECOVER] cookie userId=" + recoveredUserId);
                                } catch (NumberFormatException ignored) {}
                            }
                        }
                    }
                    if (recoveredUserId == null) {
                        String state = request.getParameter("state");
                        if (state != null && !state.isBlank()) {
                            String stateKey = "oauth_state:" + state;
                            Object mapped = redisTemplate.opsForValue().get(stateKey);
                            if (mapped != null) {
                                recoveredUserId = Long.parseLong(String.valueOf(mapped));
                                System.err.println("[CAL-LINK][RECOVER] state userId=" + recoveredUserId);
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("[CAL-LINK][RECOVER] failed: " + e.getMessage());
                }
            }

            // 캘린더 연동인 경우
            if (isCalendarLink) {
                Object attrUserId = oAuth2User.getAttribute("userId");
                Long userId = attrUserId != null ? Long.parseLong(String.valueOf(attrUserId)) : recoveredUserId;
                System.err.println("[CAL-LINK][SUCCESS] userIdAttr=" + attrUserId + ", recovered=" + recoveredUserId + ", sub=" + oAuth2User.getAttribute("sub"));
                
                if (userId == null) {
                    throw new RuntimeException("캘린더 연동 userId 식별 실패");
                }
                
                User user = userService.findById(userId).orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

                // Google 토큰 Redis에 저장
                saveGoogleTokenToRedis(authentication, request, oAuth2User.getAttribute("sub"));

                // JWT 토큰 생성
                String token = jwtTokenProvider.createToken(user.getId(), user.getEmail(), user.getName(),
                        user.getOauthProvider(), user.getOauthId(), user.getProfileImage(), user.getRole());

                // 캘린더 전용 콜백 페이지로 리다이렉트
                String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                        .queryParam("success", "true")
                        .queryParam("token", token)
                        .queryParam("calendarOnly", "true")
                        .build().encode(StandardCharsets.UTF_8).toUriString();

                System.err.println("[CAL-LINK][REDIRECT] " + targetUrl);
                response.sendRedirect(targetUrl);
                return;
            }

            // 일반 소셜 로그인인 경우 - 불필요한 신규계정 생성 방지
            String email, name, picture, oauthId;
            switch (registrationId) {
                case "google":
                    email = oAuth2User.getAttribute("email");
                    name = oAuth2User.getAttribute("name");
                    picture = oAuth2User.getAttribute("picture");
                    oauthId = oAuth2User.getAttribute("sub");
                    break;
                case "kakao":
                    email = oAuth2User.getAttribute("email");
                    name = oAuth2User.getAttribute("name");
                    picture = oAuth2User.getAttribute("picture");
                    oauthId = oAuth2User.getAttribute("id");
                    break;
                case "naver":
                    email = oAuth2User.getAttribute("email");
                    name = oAuth2User.getAttribute("name");
                    picture = oAuth2User.getAttribute("picture");
                    oauthId = oAuth2User.getAttribute("id");
                    break;
                default:
                    throw new RuntimeException("지원하지 않는 OAuth2 제공자입니다: " + registrationId);
            }

            System.err.println("[SOCIAL-LOGIN] provider=" + registrationId + ", email=" + email + ", oauthId=" + oauthId);

            // 1) provider+oauthId로 기존 사용자 찾기
            User user = userService.findByProviderAndOAuthId(registrationId, oauthId).orElse(null);
            // 2) 이메일로 기존 사용자(다른 provider/로컬 포함)
            if (user == null && email != null) {
                user = userService.findByEmail(email).orElse(null);
            }

            // 자동 회원가입 제어
            boolean allowAutoSignup = Boolean.parseBoolean(System.getenv().getOrDefault("ALLOW_SOCIAL_AUTO_SIGNUP", "false"));
            boolean isNewUser = false;
            
            if (user == null) {
                if (!allowAutoSignup) {
                    // 자동 회원가입이 차단된 경우 에러 페이지로 리다이렉트
                    String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                            .queryParam("success", "false")
                            .queryParam("error", "social_auto_signup_blocked")
                            .build().encode(StandardCharsets.UTF_8).toUriString();
                    System.err.println("[SOCIAL-LOGIN] 신규생성 차단, 리다이렉트: " + targetUrl);
                    response.sendRedirect(targetUrl);
                    return;
                } else {
                    // 자동 회원가입 허용된 경우 신규 사용자 생성
                    user = userService.saveOrUpdateOAuth2User(email, name, picture, registrationId, oauthId);
                    isNewUser = true;
                }
            } else {
                // 기존 사용자에 OAuth 정보 병합
                user.setOauthProvider(registrationId);
                user.setOauthId(oauthId);
                user.setProfileImage(picture);
                if ("google".equals(registrationId)) {
                    user.setGoogleOAuthId(oauthId);
                    user.setGoogleEmail(email);
                    user.setGoogleName(name);
                    user.setGooglePicture(picture);
                    saveGoogleTokenToRedis(authentication, request, oauthId);
                }
                user = userService.save(user);
            }

            // JWT 토큰 생성
            String token = jwtTokenProvider.createToken(user.getId(), user.getEmail(), user.getName(),
                    user.getOauthProvider(), user.getOauthId(), user.getProfileImage(), user.getRole());

            // 프론트엔드 콜백 페이지로 리다이렉트
            String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
                    .queryParam("success", "true")
                    .queryParam("token", token)
                    .queryParam("provider", user.getOauthProvider())
                    .queryParam("isNewUser", String.valueOf(isNewUser))
                    .queryParam("calendarOnly", "false")
                    .build().encode(StandardCharsets.UTF_8).toUriString();

            System.err.println("[CAL-LINK][REDIRECT] " + targetUrl);
            response.sendRedirect(targetUrl);

        } catch (Exception e) {
            System.err.println("🚨 OAuth2 로그인 성공 핸들러 오류: " + e.getMessage());
            e.printStackTrace();
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "OAuth2 로그인 처리 중 오류가 발생했습니다.");
        }
    };
}

// Google 토큰을 Redis에 저장하는 메소드
private void saveGoogleTokenToRedis(Authentication authentication, HttpServletRequest request, String googleOAuthId) {
    try {
        String registrationId = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();
        OAuth2AuthorizedClient client = authorizedClientRepository.loadAuthorizedClient(
                registrationId,
                authentication,
                request
        );
        if (client == null) {
             client = authorizedClientService.loadAuthorizedClient(registrationId, authentication.getName());
        }

        if (client != null) {
            String accessToken = client.getAccessToken().getTokenValue();
            String refreshToken = client.getRefreshToken() != null ? client.getRefreshToken().getTokenValue() : null;

            // Redis에 토큰 정보 저장
            String key = "google_token:" + googleOAuthId;
            Map<String, String> tokenData = new HashMap<>();
            tokenData.put("access_token", accessToken);
            if (refreshToken != null) {
                tokenData.put("refresh_token", refreshToken);
            }
            tokenData.put("timestamp", String.valueOf(System.currentTimeMillis()));

            redisTemplate.opsForHash().putAll(key, tokenData);
            redisTemplate.expire(key, 3600, TimeUnit.SECONDS); // 1시간 TTL
            System.err.println("🚀 Google 토큰 Redis 저장 완료: " + googleOAuthId);
        } else {
            System.err.println("🚨 OAuth2 클라이언트를 찾을 수 없음");
        }
    } catch (Exception e) {
        System.err.println("🚨 Google 토큰 Redis 저장 실패: " + e.getMessage());
    }
}
```

**설명**: 
- `loginSuccessHandler()`: OAuth2 로그인 성공 후 실행되는 핵심 핸들러
- `isCalendarLink`: 캘린더 연동인지 일반 소셜 로그인인지 판단
- 사용자 ID 복구: 여러 방법으로 사용자 ID를 복구 시도
- `ALLOW_SOCIAL_AUTO_SIGNUP` 환경변수: 자동 회원가입 허용/차단 제어
- 기존 사용자 확인: `provider+oauthId` 또는 `email`로 조회
- 기존 사용자에 OAuth 정보 병합: 신규 사용자 생성 방지
- `saveGoogleTokenToRedis()`: Google API 호출을 위한 토큰을 Redis에 저장
- JWT 토큰 생성 및 프론트엔드 콜백 페이지로 리다이렉트

### [4단계] 프론트엔드 콜백 처리
**파일**: `frontend/src/features/authentication/components/OAuth2Callback.tsx`

```typescript
const OAuth2Callback: React.FC = () => {
  const navigate = useNavigate();
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  useEffect(() => {
    const handleOAuth2Callback = async () => {
      try {
        const currentUrl = new URL(window.location.href);
        
        // URL 파라미터에서 필요한 정보 추출
        const success = currentUrl.searchParams.get('success');
        const token = currentUrl.searchParams.get('token');
        const provider = currentUrl.searchParams.get('provider');
        const isNewUser = currentUrl.searchParams.get('isNewUser');
        const calendarOnly = currentUrl.searchParams.get('calendarOnly');
        const error = currentUrl.searchParams.get('error');

        console.log('🔍 OAuth2 콜백 파라미터:', { success, token, provider, isNewUser, calendarOnly, error });

        // 에러가 있는 경우
        if (success === 'false' || error) {
          const errorMessage = error || '소셜 로그인에 실패했습니다.';
          console.error('❌ OAuth2 콜백 에러:', errorMessage);
          
          if (error === 'social_auto_signup_blocked') {
            showModal('회원가입 차단', '자동 회원가입이 차단되었습니다. 기존 계정으로 로그인하거나 로컬 회원가입을 이용해주세요.', 'error');
          } else {
            showModal('로그인 실패', errorMessage, 'error');
          }
          return;
        }

        // 성공한 경우
        if (success === 'true' && token) {
          console.log('✅ OAuth2 콜백 성공');
          
          // JWT 토큰을 localStorage에 저장
          localStorage.setItem('token', token);
          
          // 캘린더 전용 요청인 경우
          if (calendarOnly === 'true') {
            console.log('🚀 캘린더 전용 요청 - 캘린더 페이지로 이동');
            localStorage.removeItem('calendarLinkingInProgress');
            localStorage.setItem('calendarLinked', 'true');
            navigate('/calendar?linked=success');
            return;
          }

          // 일반 소셜 로그인인 경우
          if (isNewUser === 'true') {
            console.log('🚀 새 사용자 - 온보딩 페이지로 이동');
            // 새 사용자는 온보딩 1/4 페이지로 이동
            navigate('/onboarding/experience');
          } else {
            console.log('🚀 기존 사용자 - 홈 페이지로 이동');
            // 기존 사용자의 경우 onboarding 완료 상태 설정
            if (provider) {
              const providerOnboardingKey = `onboardingCompleted_${provider}`;
              localStorage.setItem(providerOnboardingKey, 'true');
              localStorage.setItem('onboardingCompleted', 'true');
            }
            
            // 기존 사용자는 바로 홈으로 이동
            navigate('/');
          }
        } else {
          console.error('❌ OAuth2 콜백 파라미터 누락');
          showModal('로그인 실패', '필수 정보가 누락되었습니다.', 'error');
        }
      } catch (error) {
        console.error('OAuth2Callback 처리 중 오류:', error);
        showModal('로그인 실패', '소셜 로그인 처리 중 오류가 발생했습니다.', 'error');
      }
    };

    // 컴포넌트 마운트 시 콜백 처리 실행
    handleOAuth2Callback();
  }, [navigate]);

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
    navigate('/login');
  };

  return (
    <div className="oauth2-callback-container">
      <div className="callback-content">
        <div className="loading-spinner">⏳</div>
        <h2>소셜 로그인 처리 중...</h2>
        <p>잠시만 기다려주세요.</p>
      </div>

      {/* 에러/성공 모달 */}
      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={closeModal}
      />
    </div>
  );
};
```

**설명**: 
- `OAuth2Callback`: OAuth2 인증 완료 후 백엔드에서 리다이렉트하는 콜백 페이지
- URL 파라미터 파싱: `success`, `token`, `provider`, `isNewUser`, `calendarOnly`, `error` 추출
- 에러 처리: `social_auto_signup_blocked` 등 다양한 에러 상황 처리
- 캘린더 전용 요청: `calendarOnly=true`인 경우 캘린더 페이지로 이동
- 사용자 분기: 새 사용자는 온보딩, 기존 사용자는 홈으로 이동
- 온보딩 상태 설정: 프로바이더별 온보딩 완료 플래그 설정
- 로딩 UI: 처리 중임을 사용자에게 표시

---

## 📝 3. 온보딩 플로우

### [1단계] 온보딩 필요 여부 확인
**파일**: `frontend/src/features/dashboard/components/Dashboard.tsx`

```typescript
// 온보딩 완료 여부 확인
useEffect(() => {
  const userRole = getRoleFromToken();
  const isAdmin = userRole === 'ROLE_ADMIN';
  
  // 관리자는 온보딩 체크를 건너뛰고 바로 대시보드 데이터 로드
  if (isAdmin) {
    console.log('👨‍💼 관리자: 온보딩 체크 건너뛰고 대시보드 데이터 로드');
    loadDashboardData();
    return;
  }
  
  // localStorage에서 온보딩 완료 상태 확인
  const localOnboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
  const currentProvider = localStorage.getItem('currentProvider');
  const providerOnboardingKey = currentProvider ? `onboardingCompleted_${currentProvider}` : null;
  const providerOnboardingCompleted = providerOnboardingKey ? localStorage.getItem(providerOnboardingKey) === 'true' : null;

  // 사용자 프로필 완성도 기반 온보딩 완료 판단
  // 주의: Dashboard 내부에서 user 컨텍스트는 직접 접근하지 않으므로, 
  // 서버 데이터 로드 전에 보수적으로 로컬 플래그를 우선 고려하되,
  // provider 키가 존재하거나 프로필 완성 추정 시 보정
  const shouldTreatAsCompleted = Boolean(localOnboardingCompleted || providerOnboardingCompleted);

  console.log('Dashboard - localOnboardingCompleted:', localOnboardingCompleted);
  console.log('Dashboard - currentProvider:', currentProvider);
  console.log('Dashboard - providerOnboardingKey:', providerOnboardingKey);
  console.log('Dashboard - providerOnboardingCompleted:', providerOnboardingCompleted);

  if (shouldTreatAsCompleted) {
    console.log('✅ onboarding 완료로 간주, 대시보드 데이터 로드');
    loadDashboardData();
  } else {
    console.log('❌ onboarding 미완료, onboarding 페이지로 이동');
    navigate('/onboarding/experience');
  }
}, [navigate]);
```

**설명**: 
- `useEffect()`: 컴포넌트 마운트 시 한 번만 실행
- 관리자는 온보딩을 건너뛰고 바로 대시보드 접근 가능
- `onboardingCompleted`: 일반 온보딩 완료 플래그
- `onboardingCompleted_${provider}`: 프로바이더별 온보딩 완료 플래그 (소셜 로그인 사용자용)
- 온보딩 미완료 시 `/onboarding/experience`로 강제 리다이렉트

**파일**: `frontend/src/features/authentication/components/AuthGuard.tsx`

```typescript
useEffect(() => {
  console.log('🔍 AuthGuard useEffect:', { user, loading, error, location: location.pathname });

  if (!loading) {
    if (user && !error) {
      console.log('✅ AuthGuard: 인증 성공');
      
      // 관리자 체크 및 온보딩 페이지 처리
      const userRole = getRoleFromToken();
      const isAdmin = userRole === 'ROLE_ADMIN';
      const isOnboardingPage = location.pathname.startsWith('/onboarding');
      const localOnboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';

      // 사용자 프로필 완성도 기반 온보딩 완료 판단 (필수 항목이 모두 채워져 있으면 완료로 간주)
      const profileComplete = Boolean(
        user?.height && user?.weight && user?.age && user?.gender
      );

      // 프로필이 이미 완성되었는데 로컬 플래그가 없다면 보정
      if (profileComplete && !localOnboardingCompleted) {
        try {
          localStorage.setItem('onboardingCompleted', 'true');
          const provider = localStorage.getItem('currentProvider');
          if (provider) {
            localStorage.setItem(`onboardingCompleted_${provider}`, 'true');
          }
          console.log('🛠 온보딩 플래그 보정: 프로필 완성으로 완료 처리');
        } catch {}
      }

      // 관리자가 온보딩 페이지에 접근하려고 하면 메인 페이지로 리다이렉트
      if (isAdmin && isOnboardingPage) {
        console.log('👨‍💼 관리자 온보딩 페이지 접근 차단, 메인 페이지로 이동');
        navigate('/');
        return;
      }
      
      // 일반 사용자가 온보딩을 완료하지 않았고(로컬 플래그/프로필 모두 미완료) 온보딩 페이지가 아닌 경우
      if (
        !isAdmin &&
        !localOnboardingCompleted &&
        !profileComplete &&
        !isOnboardingPage &&
        location.pathname !== '/'
      ) {
        console.log('📝 온보딩 미완료, 온보딩 페이지로 이동');
        navigate('/onboarding/experience');
        return;
      }
      
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  }
}, [user, loading, error, navigate, location.pathname]);
```

**설명**: 
- `AuthGuard`: 인증이 필요한 페이지에 접근할 때마다 실행되는 보안 컴포넌트
- `profileComplete`: 사용자의 키, 체중, 나이, 성별이 모두 입력되었는지 확인
- 프로필이 완성되었는데 온보딩 플래그가 없다면 자동으로 보정
- 관리자는 온보딩 페이지 접근을 차단하고 메인 페이지로 리다이렉트
- 일반 사용자는 온보딩 미완료 시 온보딩 페이지로 강제 이동

### [2단계] 1단계: 운동 경험 선택
**파일**: `frontend/src/features/onboarding/components/OnboardingExperience.tsx`

```typescript
interface ExperienceOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const experienceOptions: ExperienceOption[] = [
  {
    id: 'beginner',
    title: '초보자',
    description: '운동을 처음 시작하는 분이에요.',
    icon: '🌱',
    color: '#34C759'
  },
  {
    id: 'intermediate',
    title: '중급자',
    description: '운동 경험이 있는 분이에요.',
    icon: '🌿',
    color: '#007AFF'
  },
  {
    id: 'advanced',
    title: '고급자',
    description: '운동에 익숙한 분이에요.',
    icon: '🌳',
    color: '#FF3B30'
  }
];

const OnboardingExperience: React.FC = () => {
  const [selectedExperience, setSelectedExperience] = useState<string>('');
  const navigate = useNavigate();

  const handleExperienceSelect = (experienceId: string) => {
    setSelectedExperience(experienceId);
  };

  const handleNext = () => {
    if (selectedExperience) {
      // 선택된 경험을 localStorage에 저장하고 다음 페이지로 이동
      localStorage.setItem('userExperience', selectedExperience);
      navigate('/onboarding/goal');
    }
  };

  return (
    <div className="onboarding-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate('/login')}>
            ←
          </button>
          <div className="header-title">운동 경험</div>
          <div></div>
        </div>
        {/* 진행률 표시 바 */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '25%' }}></div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="onboarding-content">
        <div className="question-section">
          <h1 className="question-title">운동 경험이 어느 정도인가요?</h1>
          <p className="question-subtitle">경험에 맞는 운동을 추천해드릴게요.</p>
        </div>

        {/* 경험 옵션 선택 */}
        <div className="options-section">
          {experienceOptions.map((experience) => (
            <div
              key={experience.id}
              className={`option-card ${selectedExperience === experience.id ? 'selected' : ''}`}
              onClick={() => handleExperienceSelect(experience.id)}
            >
              <div className="option-content">
                <div className="experience-icon" style={{ backgroundColor: experience.color }}>
                  {experience.icon}
                </div>
                <div className="option-text">
                  <h3 className="option-title">{experience.title}</h3>
                  <p className="option-description">{experience.description}</p>
                </div>
              </div>
              {selectedExperience === experience.id && (
                <div className="selected-indicator">
                  <div className="check-icon">✓</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bottom-button-container">
        <button
          className={`button button-primary button-full ${!selectedExperience ? 'disabled' : ''}`}
          onClick={handleNext}
          disabled={!selectedExperience}
        >
          다음
        </button>
      </div>
    </div>
  );
};
```

**설명**: 
- `ExperienceOption` 인터페이스: 각 경험 옵션의 구조 정의
- `experienceOptions` 배열: 초보자, 중급자, 고급자 옵션 데이터
- `handleExperienceSelect()`: 사용자가 선택한 경험을 상태에 저장
- `handleNext()`: 선택된 경험을 localStorage에 저장하고 다음 단계로 이동
- 진행률 표시: 25% (1/4 단계)
- 선택된 옵션에 시각적 피드백 제공 (체크 아이콘, 색상 변경)

### [3단계] 2단계: 운동 목표 설정
**파일**: `frontend/src/features/onboarding/components/OnboardingGoal.tsx`

```typescript
interface GoalOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const goalOptions: GoalOption[] = [
  {
    id: 'strength',
    title: '스트렝스 근력 키우기',
    description: '근육을 키우고 힘을 기르고 싶어요.',
    icon: '💪',
    color: '#FF3B30'
  },
  {
    id: 'tone',
    title: '탄탄한 몸 만들기',
    description: '체지방을 줄이고 근육을 단단하게 만들고 싶어요.',
    icon: '🏃‍♂️',
    color: '#007AFF'
  },
  {
    id: 'diet',
    title: '다이어트 성공하기',
    description: '체중을 줄이고 건강한 몸을 만들고 싶어요.',
    icon: '⚖️',
    color: '#34C759'
  },
  {
    id: 'performance',
    title: '신체 능력 향상시키기',
    description: '전반적인 체력과 운동 능력을 높이고 싶어요.',
    icon: '🚀',
    color: '#FF9500'
  },
  {
    id: 'endurance',
    title: '체력 키우기',
    description: '지구력과 유연성을 기르고 싶어요.',
    icon: '🧘‍♀️',
    color: '#AF52DE'
  }
];

const OnboardingGoal: React.FC = () => {
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const navigate = useNavigate();

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
  };

  const handleNext = () => {
    if (selectedGoal) {
      // 선택된 목표를 localStorage에 저장하고 다음 페이지로 이동
      localStorage.setItem('userGoal', selectedGoal);
      navigate('/onboarding/basic-info');
    }
  };

  const handleBack = () => {
    navigate('/onboarding/experience');
  };

  return (
    <div className="onboarding-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={handleBack}>
            ←
          </button>
          <div className="header-title">운동 목표</div>
          <div></div>
        </div>
        {/* 진행률 표시 바 */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '50%' }}></div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="onboarding-content">
        <div className="question-section">
          <h1 className="question-title">어떤 운동을 하고 싶으신가요?</h1>
          <p className="question-subtitle">목표에 맞는 운동 프로그램을 추천해드릴게요.</p>
        </div>

        {/* 목표 옵션 선택 */}
        <div className="options-section">
          {goalOptions.map((goal) => (
            <div
              key={goal.id}
              className={`option-card ${selectedGoal === goal.id ? 'selected' : ''}`}
              onClick={() => handleGoalSelect(goal.id)}
            >
              <div className="option-content">
                <div className="goal-icon" style={{ backgroundColor: goal.color }}>
                  {goal.icon}
                </div>
                <div className="option-text">
                  <h3 className="option-title">{goal.title}</h3>
                  <p className="option-description">{goal.description}</p>
                </div>
              </div>
              {selectedGoal === goal.id && (
                <div className="selected-indicator">
                  <div className="check-icon">✓</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bottom-button-container">
        <button
          className={`button button-primary button-full ${!selectedGoal ? 'disabled' : ''}`}
          onClick={handleNext}
          disabled={!selectedGoal}
        >
          다음
        </button>
      </div>
    </div>
  );
};
```

**설명**: 
- `GoalOption` 인터페이스: 각 목표 옵션의 구조 정의
- `goalOptions` 배열: 5가지 운동 목표 (스트렝스, 탄탄한 몸, 다이어트, 신체 능력, 체력)
- `handleGoalSelect()`: 사용자가 선택한 목표를 상태에 저장
- `handleNext()`: 선택된 목표를 localStorage에 저장하고 다음 단계로 이동
- `handleBack()`: 이전 단계로 돌아가기
- 진행률 표시: 50% (2/4 단계)
- 각 목표별로 고유한 아이콘과 색상 제공

### [4단계] 3단계: 기본 정보 입력
**파일**: `frontend/src/features/onboarding/components/OnboardingBasicInfo.tsx`

```typescript
interface BasicInfo {
  height: string;
  weight: string;
  age: string;
  gender: string;
  phoneNumber: string;
}

const OnboardingBasicInfo: React.FC = () => {
  const [formData, setFormData] = useState<BasicInfo>({
    height: '',
    weight: '',
    age: '',
    gender: '',
    phoneNumber: ''
  });
  const [errors, setErrors] = useState<Partial<BasicInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // SMS 인증 관련 상태
  const [showSmsCodeInput, setShowSmsCodeInput] = useState(false);
  const [isSmsVerified, setIsSmsVerified] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState('');
  
  // 타이머 관련 상태 추가
  const [timeLeft, setTimeLeft] = useState<number>(0); // 초 단위
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [canExtend, setCanExtend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 모달 상태
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>(
    { isOpen: false, title: '', message: '', type: 'info' }
  );

  // 생년월일로부터 나이 계산하는 함수
  const calculateAgeFromBirthDate = (birthDate: string): number => {
    if (!birthDate || birthDate.length !== 8) return 0;
    
    const year = parseInt(birthDate.substring(0, 4));
    const month = parseInt(birthDate.substring(4, 6));
    const day = parseInt(birthDate.substring(6, 8));
    
    const today = new Date();
    const birth = new Date(year, month - 1, day);
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // SMS 인증 코드 전송
  const handleSendSmsCode = async () => {
    if (!formData.phoneNumber) {
      showModal('입력 오류', '휴대전화번호를 먼저 입력해주세요.', 'error');
      return;
    }

    try {
      setIsSmsLoading(true);
      
      // SMS 인증 코드 전송 API 호출
      const response = await apiClient.post(API_ENDPOINTS.VERIFY_PHONE, {
        phoneNumber: formData.phoneNumber
      });

      if (response.data.success) {
        setShowSmsCodeInput(true);
        setVerifiedPhoneNumber(formData.phoneNumber);
        
        // 타이머 시작 (3분)
        setTimeLeft(180);
        setIsTimerRunning(true);
        startTimer();
        
        showModal('인증 코드 전송', 'SMS로 인증 코드가 전송되었습니다.', 'success');
      } else {
        showModal('인증 코드 전송 실패', response.data.message || '인증 코드 전송에 실패했습니다.', 'error');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      showModal('인증 코드 전송 실패', errorMessage, 'error');
    } finally {
      setIsSmsLoading(false);
    }
  };

  // SMS 인증 코드 확인
  const handleVerifySmsCode = async () => {
    if (!smsCode) {
      showModal('입력 오류', '인증 코드를 입력해주세요.', 'error');
      return;
    }

    try {
      setIsSmsLoading(true);
      
      // SMS 인증 코드 확인 API 호출
      const response = await apiClient.post(API_ENDPOINTS.VERIFY_PHONE, {
        phoneNumber: verifiedPhoneNumber,
        code: smsCode
      });

      if (response.data.success) {
        setIsSmsVerified(true);
        setShowSmsCodeInput(false);
        stopTimer();
        showModal('인증 완료', '휴대전화번호 인증이 완료되었습니다.', 'success');
      } else {
        showModal('인증 실패', response.data.message || '인증 코드가 올바르지 않습니다.', 'error');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      showModal('인증 실패', errorMessage, 'error');
    } finally {
      setIsSmsLoading(false);
    }
  };

  // 폼 제출 처리
  const handleSubmit = async () => {
    // 폼 유효성 검사
    const newErrors: Partial<BasicInfo> = {};
    
    if (!formData.height) newErrors.height = '키를 입력해주세요';
    if (!formData.weight) newErrors.weight = '체중을 입력해주세요';
    if (!formData.age) newErrors.age = '나이를 입력해주세요';
    if (!formData.gender) newErrors.gender = '성별을 선택해주세요';
    if (!formData.phoneNumber) newErrors.phoneNumber = '휴대전화번호를 입력해주세요';
    
    if (!isSmsVerified) {
      newErrors.phoneNumber = '휴대전화번호 인증을 완료해주세요';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showModal('입력 오류', '모든 필수 항목을 입력하고 휴대전화번호 인증을 완료해주세요.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      // 이전 단계에서 저장한 정보와 함께 모든 온보딩 데이터 수집
      const allOnboardingData = {
        height: parseInt(formData.height),
        weight: parseInt(formData.weight),
        age: parseInt(formData.age),
        gender: formData.gender,
        phoneNumber: formData.phoneNumber,
        experience: localStorage.getItem('userExperience'),
        goal: localStorage.getItem('userGoal')
      };
      
      // 백엔드 API로 모든 온보딩 데이터 전송
      const response = await apiClient.put(API_ENDPOINTS.UPDATE_BASIC_INFO, allOnboardingData);
      
      if (response.data.success) {
        showModal('정보 저장 완료', '기본 정보가 성공적으로 저장되었습니다.', 'success');
        
        // 다음 단계로 이동
        setTimeout(() => {
          navigate('/onboarding/complete');
        }, 1500);
      } else {
        showModal('정보 저장 실패', response.data.message || '정보 저장에 실패했습니다.', 'error');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      showModal('정보 저장 실패', errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 이전 단계로 돌아가기
  const handleBack = () => {
    navigate('/onboarding/goal');
  };

  return (
    <div className="onboarding-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={handleBack}>
            ←
          </button>
          <div className="header-title">기본 정보</div>
          <div></div>
        </div>
        {/* 진행률 표시 바 */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '75%' }}></div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="onboarding-content">
        <div className="question-section">
          <h1 className="question-title">신체 정보를 입력해주세요</h1>
          <p className="question-subtitle">맞춤형 운동 프로그램을 제공하기 위해 필요합니다.</p>
        </div>

        {/* 폼 입력 */}
        <div className="form-section">
          <div className="input-group">
            <label>키 (cm)</label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
              placeholder="170"
              min="100"
              max="250"
            />
            {errors.height && <span className="error-message">{errors.height}</span>}
          </div>

          <div className="input-group">
            <label>체중 (kg)</label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
              placeholder="65"
              min="30"
              max="200"
            />
            {errors.weight && <span className="error-message">{errors.weight}</span>}
          </div>

          <div className="input-group">
            <label>나이</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
              placeholder="25"
              min="10"
              max="100"
            />
            {errors.age && <span className="error-message">{errors.age}</span>}
          </div>

          <div className="input-group">
            <label>성별</label>
            <div className="gender-options">
              <button
                type="button"
                className={`gender-option ${formData.gender === 'male' ? 'selected' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
              >
                남성
              </button>
              <button
                type="button"
                className={`gender-option ${formData.gender === 'female' ? 'selected' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
              >
                여성
              </button>
            </div>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>

          <div className="input-group">
            <label>휴대전화번호</label>
            <div className="phone-input-group">
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="010-1234-5678"
                disabled={isSmsVerified}
              />
              {!isSmsVerified ? (
                <button
                  type="button"
                  onClick={handleSendSmsCode}
                  disabled={isSmsLoading || !formData.phoneNumber}
                  className="verify-button"
                >
                  {isSmsLoading ? '전송 중...' : '인증 코드 전송'}
                </button>
              ) : (
                <span className="verified-badge">✓ 인증 완료</span>
              )}
            </div>
            {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
          </div>

          {/* SMS 인증 코드 입력 */}
          {showSmsCodeInput && !isSmsVerified && (
            <div className="input-group">
              <label>인증 코드</label>
              <div className="sms-input-group">
                <input
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="6자리 인증 코드"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleVerifySmsCode}
                  disabled={isSmsLoading || !smsCode}
                  className="verify-code-button"
                >
                  {isSmsLoading ? '확인 중...' : '확인'}
                </button>
              </div>
              {timeLeft > 0 && (
                <div className="timer">
                  남은 시간: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bottom-button-container">
        <button
          className="button button-secondary"
          onClick={handleBack}
        >
          이전
        </button>
        <button
          className={`button button-primary ${isLoading ? 'loading' : ''}`}
          onClick={handleSubmit}
          disabled={isLoading || !isSmsVerified}
        >
          {isLoading ? '저장 중...' : '다음'}
        </button>
      </div>

      {/* 모달 */}
      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
```

**설명**: 
- `BasicInfo` 인터페이스: 기본 정보 입력 폼의 구조 정의
- `calculateAgeFromBirthDate()`: 생년월일로부터 나이를 자동 계산
- SMS 인증: 휴대전화번호 인증을 위한 코드 전송 및 확인
- 타이머 기능: 인증 코드의 유효 시간을 표시
- 폼 유효성 검사: 모든 필수 항목 입력 및 SMS 인증 완료 확인
- `handleSubmit()`: 이전 단계에서 저장한 정보와 함께 모든 온보딩 데이터를 백엔드로 전송
- 진행률 표시: 75% (3/4 단계)

### [5단계] 4단계: 온보딩 완료
**파일**: `frontend/src/features/onboarding/components/OnboardingComplete.tsx`

```typescript
const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnectingCalendar(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('로그인이 필요합니다.');
        return;
      }

      // 온보딩 완료 플래그 설정 (연동 진행 시에도 완료로 간주)
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        const provider = localStorage.getItem('currentProvider');
        if (provider) {
          localStorage.setItem(`onboardingCompleted_${provider}`, 'true');
        }
      } catch {}

      // 구글 캘린더 연동 시작
      const response = await apiClient.get(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE);
      const data = response.data;
      if (data && data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        const errorMessage = (data && data.message) || '캘린더 연동 시작에 실패했습니다.';
        console.error('캘린더 연동 시작 실패:', errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('캘린더 연동 실패:', errorMessage);
      alert(`캘린더 연동 실패: ${errorMessage}`);
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  // JWT에서 userId 추출 함수
  function getUserIdFromToken(token: string | null): string {
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub;
    } catch {
      return '';
    }
  }

  const handleSkipCalendar = () => {
    try {
      // 온보딩 완료 플래그 설정
      localStorage.setItem('onboardingCompleted', 'true');
      const provider = localStorage.getItem('currentProvider');
      if (provider) {
        localStorage.setItem(`onboardingCompleted_${provider}`, 'true');
      }
    } catch {}
    
    // 대시보드로 이동
    navigate('/');
  };

  return (
    <div className="onboarding-complete-container">
      <div className="complete-content">
        <div className="success-icon">🎉</div>
        <h1>온보딩 완료!</h1>
        <p>이제 FitMate와 함께 건강한 운동을 시작해보세요.</p>
        
        <div className="calendar-option">
          <h3>구글 캘린더 연동</h3>
          <p>운동 일정을 구글 캘린더와 연동하여 더 체계적으로 관리하세요.</p>
          
          <div className="calendar-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">📅</span>
              <span>운동 일정 자동 동기화</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔔</span>
              <span>운동 알림 설정</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📊</span>
              <span>운동 기록 관리</span>
            </div>
          </div>
          
          <div className="calendar-actions">
            <button 
              onClick={handleConnectGoogleCalendar}
              disabled={isConnectingCalendar}
              className="connect-calendar-btn"
            >
              {isConnectingCalendar ? '연동 중...' : '구글 캘린더 연동하기'}
            </button>
            <button 
              onClick={handleSkipCalendar}
              className="skip-calendar-btn"
            >
              나중에 하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**설명**: 
- 온보딩 완료 축하 메시지와 함께 구글 캘린더 연동 옵션 제공
- `handleConnectGoogleCalendar()`: 구글 캘린더 연동 시작 및 온보딩 완료 플래그 설정
- `handleSkipCalendar()`: 캘린더 연동을 건너뛰고 온보딩 완료 플래그 설정 후 대시보드로 이동
- 캘린더 연동의 장점을 시각적으로 설명 (운동 일정 동기화, 알림 설정, 기록 관리)
- 진행률 표시: 100% (4/4 단계 완료)

---

## 📅 5. 캘린더 연결 플로우

### [1단계] 캘린더 연동 시작
**파일**: `frontend/src/features/settings/components/Settings.tsx`

```typescript
const handleConnectGoogleCalendar = async () => {
  try {
    setIsConnectingCalendar(true);
    
    // 캘린더 연동 진행 상태 표시
    localStorage.setItem('calendarLinkingInProgress', 'true');
    
    // 백엔드에 캘린더 연동 시작 요청
    const response = await apiClient.get(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE);
    const data = response.data;
    
    if (data && data.success && data.authUrl) {
      console.log('🚀 Google 캘린더 연동 시작:', data.authUrl);
      // 백엔드에서 제공한 OAuth URL로 리다이렉트
      window.location.href = data.authUrl;
    } else {
      const errorMessage = data?.message || '캘린더 연동을 시작할 수 없습니다.';
      showModal('연동 실패', errorMessage, 'error');
    }
  } catch (error) {
    const errorMessage = handleApiError(error);
    showModal('연동 실패', errorMessage, 'error');
  } finally {
    setIsConnectingCalendar(false);
  }
};
```

**설명**: 
- `handleConnectGoogleCalendar()`: 사용자가 '구글 캘린더 연동' 버튼을 클릭했을 때 실행
- `localStorage.setItem('calendarLinkingInProgress', 'true')`: 연동 진행 상태를 브라우저에 저장
- `apiClient.get(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE)`: 백엔드에 캘린더 연동 시작 요청
- `window.location.href = data.authUrl`: 백엔드에서 제공한 OAuth URL로 리다이렉트

### [2단계] 백엔드 캘린더 연동 컨텍스트 설정
**파일**: `src/main/java/backend/fitmate/controller/CalendarController.java`

```java
@GetMapping("/auth/google")
@PreAuthorize("hasRole('ROLE_USER')")  // 인증된 사용자만 접근 가능
public ResponseEntity<?> startGoogleAuth(HttpServletRequest request, 
                                       HttpServletResponse response,
                                       Authentication authentication) {
    try {
        // JWT 토큰에서 사용자 ID 추출
        Long userId = getUserIdFromAuthentication(authentication);
        System.out.println("[CAL-LINK][START] userId=" + userId);
        
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false, 
                "message", "사용자 인증 정보를 찾을 수 없습니다."
            ));
        }
        
        // 1) 세션에 캘린더 연동 마커 저장
        HttpSession session = request.getSession(true);
        session.setAttribute("calendar_linking_active", true);
        session.setAttribute("calendar_linking_user_id", userId);
        System.out.println("[CAL-LINK][SESSION] sessionId=" + session.getId() + ", userId=" + userId);
        
        // 2) Redis에도 세션 ID로 사용자 매핑 저장 (15분 TTL)
        String sessionKey = "calendar_session:" + session.getId();
        redisTemplate.opsForValue().set(sessionKey, String.valueOf(userId), Duration.ofMinutes(15));
        System.out.println("[CAL-LINK][REDIS] key=" + sessionKey + ", value=" + userId);
        
        // 3) HttpOnly 쿠키에도 userId 저장 (보안 강화)
        Cookie cookie = new Cookie("calendar_link_uid", String.valueOf(userId));
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(900); // 15분
        response.addCookie(cookie);
        System.out.println("[CAL-LINK][COOKIE] calendar_link_uid=" + userId);
        
        // 4) OAuth2 state 파라미터에 사용자 ID 매핑 (하위 호환)
        String state = UUID.randomUUID().toString();
        String stateKey = "oauth_state:" + state;
        redisTemplate.opsForValue().set(stateKey, String.valueOf(userId), Duration.ofMinutes(15));
        System.out.println("[CAL-LINK][STATE] state=" + state + ", userId=" + userId);
        
        // Google OAuth2 인증 URL 생성 (google-connect registration 사용)
        String authUrl = UriComponentsBuilder.fromPath("/oauth2/authorization/google-connect")
                .queryParam("state", state)  // state 파라미터 추가
                .toUriString();
        
        System.out.println("[CAL-LINK][AUTH-URL] " + authUrl);
        
        return ResponseEntity.ok(Map.of(
            "success", true, 
            "authUrl", authUrl
        ));
        
    } catch (Exception e) {
        System.err.println("🚨 캘린더 연동 시작 실패: " + e.getMessage());
        e.printStackTrace();
        return ResponseEntity.internalServerError().body(Map.of(
            "success", false, 
            "message", "캘린더 연동을 시작할 수 없습니다: " + e.getMessage()
        ));
    }
}

// JWT 토큰에서 사용자 ID를 추출하는 헬퍼 메소드
private Long getUserIdFromAuthentication(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
        return null;
    }
    
    try {
        // JWT 토큰에서 사용자 ID 추출
        String token = ((JwtAuthenticationToken) authentication).getToken().getTokenValue();
        Claims claims = jwtTokenProvider.getClaims(token);
        return Long.parseLong(claims.getSubject());
    } catch (Exception e) {
        System.err.println("🚨 JWT 토큰 파싱 실패: " + e.getMessage());
        return null;
    }
}
```

**설명**: 
- `@PreAuthorize("hasRole('ROLE_USER')")`: 인증된 사용자만 접근 가능하도록 보안 설정
- `getUserIdFromAuthentication()`: JWT 토큰에서 사용자 ID를 추출하는 헬퍼 메소드
- **4단계 사용자 ID 저장**:
  1. **세션**: `calendar_linking_active`, `calendar_linking_user_id` 속성으로 저장
  2. **Redis**: `calendar_session:{sessionId}` 키로 15분 TTL 설정
  3. **HttpOnly 쿠키**: `calendar_link_uid`로 보안 강화
  4. **OAuth2 state**: `oauth_state:{state}` 키로 15분 TTL 설정
- `google-connect` registration 사용: 일반 Google 로그인과 구분하여 캘린더 연동 전용 처리

### [3단계] OAuth2 인증 요청 커스터마이징
**파일**: `src/main/java/backend/fitmate/config/CustomAuthorizationRequestResolver.java`

```java
@Component
@RequiredArgsConstructor
public class CustomAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {
    
    private final OAuth2AuthorizationRequestResolver defaultResolver;
    private final RedisTemplate<String, Object> redisTemplate;
    private final HttpServletRequest request;

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return resolve(request, null);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        // 기본 OAuth2 인증 요청 해결
        OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request, clientRegistrationId);
        
        if (authorizationRequest == null) {
            return null;
        }
        
        try {
            // 캘린더 연동 사용자 ID 추출 (우선순위: 쿠키 > 세션 > state)
            Long userId = null;
            
            // 1) HttpOnly 쿠키에서 우선 추출
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if ("calendar_link_uid".equals(cookie.getName())) {
                        try {
                            userId = Long.parseLong(cookie.getValue());
                            System.out.println("[CAL-LINK][RESOLVER] 쿠키에서 userId 추출: " + userId);
                            break;
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
            
            // 2) 세션에서 추출
            if (userId == null) {
                HttpSession session = request.getSession(false);
                if (session != null) {
                    Object marker = session.getAttribute("calendar_linking_active");
                    Object uid = session.getAttribute("calendar_linking_user_id");
                    if (Boolean.TRUE.equals(marker) && uid != null) {
                        userId = Long.parseLong(String.valueOf(uid));
                        System.out.println("[CAL-LINK][RESOLVER] 세션에서 userId 추출: " + userId);
                    }
                }
            }
            
            // 3) state 파라미터에서 추출 (하위 호환)
            if (userId == null) {
                String state = request.getParameter("state");
                if (state != null && !state.isBlank()) {
                    String stateKey = "oauth_state:" + state;
                    Object mappedUserId = redisTemplate.opsForValue().get(stateKey);
                    if (mappedUserId != null) {
                        userId = Long.parseLong(String.valueOf(mappedUserId));
                        System.out.println("[CAL-LINK][RESOLVER] state에서 userId 추출: " + userId);
                    }
                }
            }
            
            // userId가 추출된 경우 OAuth2 state에 매핑
            if (userId != null) {
                String state = authorizationRequest.getState();
                if (state != null && !state.isBlank()) {
                    String stateKey = "oauth_state:" + state;
                    redisTemplate.opsForValue().set(stateKey, String.valueOf(userId), Duration.ofMinutes(15));
                    System.out.println("[CAL-LINK][RESOLVER] state 매핑 완료: " + state + " -> " + userId);
                }
            }
            
            // Google OAuth2 요청에 필수 파라미터 추가
            Map<String, Object> additionalParameters = new HashMap<>(authorizationRequest.getAdditionalParameters());
            
            // access_type=offline: 리프레시 토큰 발급을 위해 필수
            additionalParameters.put("access_type", "offline");
            
            // prompt=consent: 사용자에게 항상 동의 요청 (새로운 스코프 추가 시)
            additionalParameters.put("prompt", "consent");
            
            // include_granted_scopes=true: 이전에 승인된 스코프도 포함
            additionalParameters.put("include_granted_scopes", "true");
            
            // 수정된 OAuth2 인증 요청 반환
            return OAuth2AuthorizationRequest.from(authorizationRequest)
                    .additionalParameters(additionalParameters)
                    .build();
                    
        } catch (Exception e) {
            System.err.println("🚨 OAuth2 인증 요청 커스터마이징 실패: " + e.getMessage());
            // 에러가 발생해도 기본 요청은 반환
            return authorizationRequest;
        }
    }
}
```

**설명**: 
- `CustomAuthorizationRequestResolver`: OAuth2 인증 요청을 커스터마이징하는 컴포넌트
- **사용자 ID 추출 우선순위**:
  1. **HttpOnly 쿠키**: `calendar_link_uid`에서 우선 추출
  2. **세션**: `calendar_linking_active`, `calendar_linking_user_id`에서 추출
  3. **state 파라미터**: `oauth_state:{state}` 키에서 추출 (하위 호환)
- **Google OAuth2 필수 파라미터**:
  - `access_type=offline`: 리프레시 토큰 발급 (캘린더 API 지속 호출용)
  - `prompt=consent`: 사용자에게 항상 동의 요청
  - `include_granted_scopes=true`: 이전 승인된 스코프 포함
- **state 매핑**: 추출된 사용자 ID를 OAuth2 state와 Redis에 매핑하여 나중에 복구 가능

### [4단계] OIDC 사용자 정보 처리
**파일**: `src/main/java/backend/fitmate/config/CustomOidcUserService.java`

```java
@Component
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {
    
    private final UserService userService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final HttpServletRequest request;

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        // 기본 OIDC 사용자 정보 로드
        OidcUser oidcUser = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        
        System.out.println("🔀 [CustomOidcUserService] registrationId=" + registrationId);
        
        // google-connect registration인 경우에만 캘린더 연동 처리
        if ("google-connect".equals(registrationId)) {
            try {
                // 캘린더 연동 사용자 ID 복구
                Long calendarLinkingUserId = recoverCalendarLinkingUserId();
                
                if (calendarLinkingUserId != null) {
                    System.out.println("[CAL-LINK][OIDC] 캘린더 연동 사용자 확인: userId=" + calendarLinkingUserId);
                    
                    // Google 사용자 정보 추출
                    String googleOauthId = oidcUser.getAttribute("sub");
                    String googleEmail = oidcUser.getAttribute("email");
                    String googleName = oidcUser.getAttribute("name");
                    String googlePicture = oidcUser.getAttribute("picture");
                    
                    System.out.println("[CAL-LINK][OIDC] Google 정보: email=" + googleEmail + ", name=" + googleName + ", sub=" + googleOauthId);
                    
                    // 기존 사용자에 Google 캘린더 정보 추가 (신규 사용자 생성 방지)
                    User updatedUser = userService.addGoogleCalendarInfoByUserId(
                        calendarLinkingUserId, googleEmail, googleName, googlePicture, googleOauthId);
                    
                    System.out.println("[CAL-LINK][OIDC] 사용자 업데이트 완료: userId=" + updatedUser.getId());
                    
                    // OIDC 사용자에 추가 정보 설정
                    Map<String, Object> attributes = new HashMap<>(oidcUser.getAttributes());
                    attributes.put("provider", "google-connect");
                    attributes.put("userId", updatedUser.getId().toString());
                    attributes.put("calendarLinking", true);
                    
                    // 수정된 OIDC 사용자 반환
                    return new DefaultOidcUser(
                        oidcUser.getAuthorities(), 
                        oidcUser.getIdToken(), 
                        oidcUser.getUserInfo(),
                        "sub"
                    );
                } else {
                    System.err.println("🚨 [CustomOidcUserService] 캘린더 연동 사용자 ID를 찾을 수 없음");
                }
            } catch (Exception e) {
                System.err.println("🚨 [CustomOidcUserService] 캘린더 연동 처리 실패: " + e.getMessage());
                e.printStackTrace();
                throw new OAuth2AuthenticationException("캘린더 연동 처리 중 오류가 발생했습니다: " + e.getMessage());
            }
        }
        
        // 일반 OIDC 사용자 또는 캘린더 연동이 아닌 경우 기본 반환
        return oidcUser;
    }
    
    // 캘린더 연동 사용자 ID를 복구하는 메소드
    private Long recoverCalendarLinkingUserId() {
        try {
            // 1) 세션에서 확인
            HttpSession session = request.getSession(false);
            if (session != null) {
                Object marker = session.getAttribute("calendar_linking_active");
                Object uid = session.getAttribute("calendar_linking_user_id");
                if (Boolean.TRUE.equals(marker) && uid != null) {
                    Long userId = Long.parseLong(String.valueOf(uid));
                    System.out.println("[CAL-LINK][OIDC] 세션에서 userId 복구: " + userId);
                    return userId;
                }
                
                // 2) Redis 세션 매핑으로 확인
                String key = "calendar_session:" + session.getId();
                Object val = redisTemplate.opsForValue().get(key);
                if (val != null) {
                    Long userId = Long.parseLong(String.valueOf(val));
                    System.out.println("[CAL-LINK][OIDC] Redis 세션에서 userId 복구: " + userId);
                    return userId;
                }
            }
            
            // 3) HttpOnly 쿠키에서 확인
            if (request.getCookies() != null) {
                for (Cookie c : request.getCookies()) {
                    if ("calendar_link_uid".equals(c.getName())) {
                        try {
                            Long userId = Long.parseLong(c.getValue());
                            System.out.println("[CAL-LINK][OIDC] 쿠키에서 userId 복구: " + userId);
                            return userId;
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
            
            // 4) state 파라미터에서 확인 (하위 호환)
            String state = request.getParameter("state");
            if (state != null && !state.isBlank()) {
                String stateKey = "oauth_state:" + state;
                Object mappedUserId = redisTemplate.opsForValue().get(stateKey);
                if (mappedUserId != null) {
                    Long userId = Long.parseLong(String.valueOf(mappedUserId));
                    redisTemplate.delete(stateKey); // 일회성 사용 후 즉시 삭제
                    System.out.println("[CAL-LINK][OIDC] state에서 userId 복구: " + userId);
                    return userId;
                }
            }
            
        } catch (Exception e) {
            System.err.println("🚨 [CustomOidcUserService] 사용자 ID 복구 실패: " + e.getMessage());
        }
        
        return null;
    }
}
```

**설명**: 
- `CustomOidcUserService`: OpenID Connect 사용자 정보를 처리하는 커스텀 서비스
- `google-connect` registration만 처리: 일반 Google 로그인과 구분
- **사용자 ID 복구 순서**:
  1. **세션**: `calendar_linking_active`, `calendar_linking_user_id`
  2. **Redis**: `calendar_session:{sessionId}`
  3. **쿠키**: `calendar_link_uid`
  4. **state**: `oauth_state:{state}` (일회성 사용 후 삭제)
- `userService.addGoogleCalendarInfoByUserId()`: 기존 사용자에 Google 정보 추가 (신규 사용자 생성 방지)
- OIDC 사용자에 `calendarLinking=true` 플래그 설정하여 나중에 식별 가능

### [5단계] 로그인 성공 핸들러에서 캘린더 연동 처리
**파일**: `src/main/java/backend/fitmate/config/SecurityConfig.java`

```java
// 캘린더 연동인 경우
if (isCalendarLink) {
    Object attrUserId = oAuth2User.getAttribute("userId");
    Long userId = attrUserId != null ? Long.parseLong(String.valueOf(attrUserId)) : recoveredUserId;
    System.err.println("[CAL-LINK][SUCCESS] userIdAttr=" + attrUserId + ", recovered=" + recoveredUserId + ", sub=" + oAuth2User.getAttribute("sub"));
    
    if (userId == null) {
        throw new RuntimeException("캘린더 연동 userId 식별 실패");
    }
    
    // 사용자 정보 조회
    User user = userService.findById(userId).orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

    // Google 토큰을 Redis에 저장 (API 호출용)
    saveGoogleTokenToRedis(authentication, request, oAuth2User.getAttribute("sub"));

    // JWT 토큰 생성
    String token = jwtTokenProvider.createToken(user.getId(), user.getEmail(), user.getName(),
            user.getOauthProvider(), user.getOauthId(), user.getProfileImage(), user.getRole());

    // 캘린더 전용 콜백 페이지로 리다이렉트
    String targetUrl = UriComponentsBuilder.fromUriString(getFrontendBaseUrl() + "/#/auth/callback")
            .queryParam("success", "true")
            .queryParam("token", token)
            .queryParam("calendarOnly", "true")  // 캘린더 전용 요청임을 표시
            .build().encode(StandardCharsets.UTF_8).toUriString();

    System.err.println("[CAL-LINK][REDIRECT] " + targetUrl);
    response.sendRedirect(targetUrl);
    return;
}
```

**설명**: 
- `isCalendarLink`: `google-connect` registration 또는 `calendarLinking` 속성으로 판단
- 사용자 ID 복구: OAuth2User 속성 또는 폴백 메커니즘으로 복구
- `saveGoogleTokenToRedis()`: Google API 호출을 위한 액세스/리프레시 토큰을 Redis에 저장
- JWT 토큰 생성: 캘린더 연동 완료된 사용자를 위한 인증 토큰
- `calendarOnly=true`: 프론트엔드에서 캘린더 전용 요청임을 식별할 수 있도록 파라미터 추가

### [6단계] 프론트엔드 캘린더 연동 완료 처리
**파일**: `frontend/src/features/authentication/components/OAuth2Callback.tsx`

```typescript
// 캘린더 전용 요청인 경우
if (calendarOnly === 'true') {
  console.log('🚀 캘린더 전용 요청 - 캘린더 페이지로 이동');
  
  // 연동 진행 상태 제거
  localStorage.removeItem('calendarLinkingInProgress');
  
  // 연동 완료 상태 설정
  localStorage.setItem('calendarLinked', 'true');
  
  // 캘린더 페이지로 이동 (성공 파라미터와 함께)
  navigate('/calendar?linked=success');
  return;
}
```

**설명**: 
- `calendarOnly === 'true'`: 백엔드에서 캘린더 전용 요청임을 표시한 경우
- `localStorage.removeItem('calendarLinkingInProgress')`: 연동 진행 상태 제거
- `localStorage.setItem('calendarLinked', 'true')`: 연동 완료 상태 설정
- `navigate('/calendar?linked=success')`: 캘린더 페이지로 이동하며 성공 상태 전달

---

## 🔄 플로우 간 관계 및 전환점

### **플로우 진입점**
1. **로컬 회원가입**: `/signup` 페이지 접근
2. **로컬 로그인**: `/login` 페이지 접근
3. **소셜 로그인**: 소셜 로그인 버튼 클릭
4. **온보딩**: 신규 사용자 로그인 후 자동 리다이렉트
5. **캘린더 연결**: 설정 페이지에서 '구글 캘린더 연동' 버튼 클릭

### **플로우 종료점**
1. **로컬 회원가입**: 로그인 페이지로 리다이렉트
2. **로컬 로그인**: 대시보드로 리다이렉트
3. **소셜 로그인**: 신규 사용자는 온보딩, 기존 사용자는 대시보드로 리다이렉트
4. **온보딩**: 대시보드로 리다이렉트 (캘린더 연동 옵션 포함)
5. **캘린더 연결**: 캘린더 페이지로 리다이렉트

### **플로우 간 전환 조건**
- **회원가입 → 로그인**: 회원가입 완료 후 자동 전환
- **로그인 → 온보딩**: 신규 사용자 또는 온보딩 미완료 사용자
- **로그인 → 대시보드**: 기존 사용자 또는 온보딩 완료 사용자
- **온보딩 → 캘린더 연결**: 온보딩 완료 시 선택적 전환
- **캘린더 연결 → 대시보드**: 연동 완료 후 대시보드로 이동

### **공통 보안 메커니즘**
- **JWT 토큰**: 모든 인증된 요청에 JWT 토큰 필요
- **Role 기반 접근 제어**: `@PreAuthorize` 어노테이션으로 권한 검증
- **Rate Limiting**: 회원가입, 로그인 등에 IP 기반 요청 제한
- **CSRF 보호**: Spring Security 기본 CSRF 보호 활성화
- **세션 관리**: Redis 기반 세션 저장 및 관리

### **데이터 일관성 보장**
- **캐시 무효화**: `@CacheEvict`로 사용자 정보 업데이트 시 캐시 정리
- **트랜잭션 관리**: `@Transactional`로 데이터베이스 작업의 원자성 보장
- **중복 사용자 방지**: 이메일, OAuth ID 기반 중복 검사
- **상태 동기화**: 프론트엔드 localStorage와 백엔드 데이터베이스 상태 동기화

---

## 📊 시스템 아키텍처 요약

### **프론트엔드 (React + TypeScript)**
- **상태 관리**: React Context API + localStorage
- **라우팅**: React Router v6
- **HTTP 클라이언트**: Axios (인터셉터 포함)
- **UI 컴포넌트**: 커스텀 컴포넌트 + CSS 모듈

### **백엔드 (Spring Boot + Java)**
- **보안**: Spring Security + OAuth2 + JWT
- **데이터베이스**: JPA/Hibernate + MySQL
- **캐싱**: Redis (세션, 토큰, 사용자 매핑)
- **API**: RESTful API + JSON 응답

### **인프라**
- **프록시**: Nginx (리버스 프록시, OAuth 콜백 라우팅)
- **컨테이너**: Docker + Docker Compose
- **환경**: 개발/프로덕션 환경 분리

### **OAuth2 플로우**
- **Google**: OpenID Connect + Calendar API 스코프
- **Kakao**: OAuth2 + 사용자 정보 API
- **Naver**: OAuth2 + 사용자 정보 API

이 문서는 FitMate의 인증 시스템의 전체적인 구조와 각 플로우의 상세한 동작 방식을 설명합니다. 각 단계별로 코드 예시와 설명을 포함하여 개발자가 시스템을 이해하고 유지보수할 수 있도록 구성되었습니다.