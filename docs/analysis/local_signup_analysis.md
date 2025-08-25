# FitMate 프로젝트 - 로컬 회원가입 시스템 분석

## 개요
FitMate 프로젝트의 로컬 회원가입 시스템에 대한 상세 분석 문서입니다. 프론트엔드와 백엔드의 구조, 플로우, 주요 코드를 포함합니다.

## 파일 구조

### 프론트엔드 (React + TypeScript)
```
frontend/src/
├── components/
│   └── SignupForm.tsx          # 로그인/회원가입 폼
├── context/
│   └── UserContext.tsx         # 사용자 상태 관리
├── config/
│   └── api.ts                  # API 엔드포인트 설정
└── utils/
    └── oauthHelper.ts          # OAuth 관련 헬퍼 함수
```

### 백엔드 (Spring Boot + Java)
```
src/main/java/backend/fitmate/
├── controller/
│   └── AuthController.java     # 인증 관련 컨트롤러
├── User/
│   ├── entity/
│   │   └── User.java          # 사용자 엔티티
│   └── service/
│       └── UserService.java   # 사용자 서비스
└── config/
    ├── SecurityConfig.java     # Spring Security 설정
    ├── JwtTokenProvider.java   # JWT 토큰 생성/검증
    └── JwtAuthenticationFilter.java # JWT 인증 필터
```

## 로컬 회원가입 플로우

### 1. 사용자 입력 단계
- 이메일, 비밀번호, 이름 입력
- 기본적인 입력값 검증 (프론트엔드)
- 이메일 중복 확인

### 2. API 호출 단계
- `/api/auth/register` 엔드포인트로 POST 요청
- Content-Type: application/json
- Body: { email, password, name }

### 3. 백엔드 회원가입 처리
1. 이메일 중복 검사
2. 비밀번호 암호화 (BCrypt)
3. 사용자 정보 저장
4. JWT 토큰 생성
5. 사용자 정보와 함께 응답

### 4. 프론트엔드 응답 처리
- JWT 토큰을 localStorage에 저장
- UserContext를 통해 사용자 상태 업데이트
- 온보딩 또는 대시보드로 리다이렉트

## 주요 코드 분석

### 프론트엔드 - SignupForm.tsx

#### 상태 관리
(구조분해 할당, 최초 접속시 로그인폼 보여줌)
usestate는 호출된 순서로 관리. 즉 login은 첫째, 이메일은 둘째 이런느낌임.
```typescript
const [isLogin, setIsLogin] = useState(true);
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [name, setName] = useState('');

// 구조분해 할당 안할시. useState
const temp = useState(true);
const isLogin = temp[0];
const setIsLogin = temp[1];
```

#### 회원가입 처리 함수
```typescript
const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const response = await fetch(API_ENDPOINTS.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('currentProvider', 'local');
      // 온보딩 완료 여부에 따라 리다이렉트
      if (data.onboardingCompleted) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  } catch (error) {
    console.error('회원가입 실패:', error);
  }
};
```

### 프론트엔드 - UserContext.tsx

#### 사용자 인터페이스
```typescript
interface User {
  id: number;
  name: string;
  email: string;
  provider: string; // 'local', 'google', 'kakao', 'naver'
  height?: number;
  weight?: number;
  age?: number;
  gender?: string;
  phoneNumber?: string;
  birthDate?: string;
  picture?: string;
}
```

#### 컨텍스트 구조
```typescript
const UserContext = createContext<{
  user: User | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}>({
  user: null,
  loading: true,
  error: null,
  refresh: () => {}
});
```

### 백엔드 - AuthController.java

#### 회원가입 엔드포인트
```java
@PostMapping("/register")
public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
    // 1. 이메일 중복 검사
    if (userService.existsByEmail(request.getEmail())) {
        throw new EmailAlreadyExistsException("이미 존재하는 이메일입니다.");
    }
    
    // 2. 비밀번호 암호화
    String encodedPassword = passwordEncoder.encode(request.getPassword());
    
    // 3. 사용자 생성
    User user = new User();
    user.setEmail(request.getEmail());
    user.setPassword(encodedPassword);
    user.setName(request.getName());
    user.setProvider("local");
    
    // 4. 사용자 저장
    User savedUser = userService.save(user);
    
    // 5. JWT 토큰 생성
    String token = jwtTokenProvider.createToken(savedUser.getEmail());
    
    // 6. 응답 반환
    return ResponseEntity.ok(new RegisterResponse(token, savedUser));
}
```

#### 로그인 엔드포인트
```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request) {
    // 1. 사용자 인증
    UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
    
    // 2. 비밀번호 검증
    if (!passwordEncoder.matches(request.getPassword(), userDetails.getPassword())) {
        throw new BadCredentialsException("Invalid password");
    }
    
    // 3. JWT 토큰 생성
    String token = jwtTokenProvider.createToken(userDetails.getUsername());
    
    // 4. 응답 반환
    return ResponseEntity.ok(new LoginResponse(token, userDetails));
}
```

### 백엔드 - SecurityConfig.java

#### 보안 설정
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
```

### 백엔드 - JwtTokenProvider.java

#### JWT 토큰 생성
```java
@Component
public class JwtTokenProvider {
    private String secretKey = "your-secret-key";
    private long validityInMilliseconds = 3600000; // 1시간
    
    public String createToken(String username) {
        Claims claims = Jwts.claims().setSubject(username);
        Date now = new Date();
        Date validity = new Date(now.getTime() + validityInMilliseconds);
        
        return Jwts.builder()
            .setClaims(claims)
            .setIssuedAt(now)
            .setExpiration(validity)
            .signWith(SignatureAlgorithm.HS256, secretKey)
            .compact();
    }
}
```

## 주요 변수와 메소드

### 프론트엔드
- `email`, `password`, `name`: 회원가입 입력값
- `handleRegister()`: 회원가입 처리 함수
- `API_ENDPOINTS.REGISTER`: 회원가입 API 엔드포인트
- `localStorage.setItem('token', data.token)`: JWT 토큰 저장

### 백엔드
- `RegisterRequest`: 회원가입 요청 DTO
- `RegisterResponse`: 회원가입 응답 DTO
- `UserService.existsByEmail()`: 이메일 중복 검사
- `PasswordEncoder.encode()`: 비밀번호 암호화
- `UserService.save()`: 사용자 정보 저장
- `JwtTokenProvider.createToken()`: JWT 토큰 생성

## 보안 관련 설정

### 비밀번호 인코딩
```java
@Configuration
public class PasswordConfig {
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### JWT 인증 필터
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        // JWT 토큰 추출 및 검증
        // 인증 정보 설정
    }
}
```

## API 엔드포인트

### 인증 관련
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/verify-password` - 비밀번호 확인

## 데이터베이스 스키마

### User 테이블
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) DEFAULT 'local',
    height INT,
    weight DECIMAL(5,2),
    age INT,
    gender VARCHAR(10),
    phone_number VARCHAR(20),
    birth_date DATE,
    picture VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 에러 처리

### 프론트엔드 에러 처리
- 네트워크 오류 시 콘솔 로그 및 사용자 알림
- 서버 응답 오류 시 적절한 에러 메시지 표시

### 백엔드 에러 처리
- `GlobalExceptionHandler`를 통한 전역 예외 처리
- 인증 실패 시 `BadCredentialsException` 발생
- 유효성 검사 실패 시 적절한 에러 응답

## 성능 및 확장성 고려사항

### 보안 강화 방안
- **비밀번호 정책**: 최소 8자, 대소문자/숫자/특수문자 조합
- **계정 잠금**: 5회 실패 시 15분 잠금
- **토큰 관리**: Refresh Token 도입으로 보안성 향상
- **입력 검증**: SQL Injection, XSS 방지

### 성능 최적화
- **Redis 세션 캐싱**: JWT 토큰 검증 성능 향상
- **데이터베이스 인덱싱**: 이메일 필드 인덱스
- **API 응답 최적화**: 불필요한 데이터 제거

### 확장성 설계
- **마이크로서비스 아키텍처**: 인증 서비스 분리 가능
- **로드 밸런싱**: 다중 인스턴스 배포 대응
- **국제화**: 다국어 지원 준비

## 면접 예상 질문 대비

### 기술적 질문
1. **Q: JWT 대신 세션 기반 인증을 사용하지 않은 이유는?**
   - A: 마이크로서비스 아키텍처에서 상태가 없는(stateless) JWT가 확장성에 유리
   - Redis를 통한 토큰 검증으로 보안성과 성능 모두 확보

2. **Q: 비밀번호 암호화에 BCrypt를 선택한 이유는?**
   - A: Salt 자동 생성, adaptive hashing으로 보안성 우수
   - Spring Security와의 호환성 및 업계 표준

3. **Q: CSRF 비활성화가 안전한가?**
   - A: JWT 토큰 기반 인증에서는 CSRF 공격 위험이 낮음
   - SameSite 쿠키 정책과 CORS 설정으로 추가 보안

### 설계 질문
1. **Q: 회원가입 실패 시 롤백 처리는?**
   - A: @Transactional 어노테이션으로 데이터베이스 트랜잭션 보장
   - 이메일 중복 검사를 사전에 수행하여 실패 확률 최소화

2. **Q: 대용량 트래픽 시 병목점은?**
   - A: 데이터베이스 연결 풀, JWT 검증 부하가 주요 병목점
   - Redis 캐싱과 Connection Pool 최적화로 해결

## 향후 분석 예정 항목

1. **로컬 로그인 시스템** - 비밀번호 검증 및 JWT 인증
2. **소셜 로그인 시스템** (Google, Kakao, Naver)
3. **사용자 프로필 관리 시스템**
4. **운동 기록 및 분석 시스템**
5. **채팅 및 알림 시스템**
6. **운동 프로그램 관리 시스템**
7. **데이터베이스 구조 및 관계**
8. **API 설계 및 문서화**
9. **보안 및 인증 시스템**
10. **성능 최적화 및 캐싱**
11. **테스트 코드 및 품질 관리**

---

*이 문서는 FitMate 프로젝트의 로컬 회원가입 시스템에 대한 상세 분석을 제공합니다. 
프로젝트 전반에 대한 이해를 위해 지속적으로 업데이트될 예정입니다.* 