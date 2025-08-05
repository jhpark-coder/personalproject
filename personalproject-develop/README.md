# FitMate - 피트니스 커뮤니티 플랫폼

Spring Boot + React + TypeScript로 구축된 피트니스 커뮤니티 플랫폼입니다.

## 🚀 프로젝트 구조

```
fitmate/
├── frontend/          # React + TypeScript 프론트엔드
├── src/main/java/     # Spring Boot 백엔드
├── docker-compose.yml # Docker 설정
└── pom.xml           # Maven 설정
```

## 🎯 주요 기능

### 🔐 인증 시스템
- **이메일/비밀번호 로그인**: 전통적인 로그인 방식
- **OAuth2 소셜 로그인**: Google, Naver, Kakao 지원
- **JWT 토큰 기반 인증**: 보안성과 확장성 확보
- **이메일 인증**: 회원가입 시 이메일 인증 코드 발송
- **휴대폰 인증**: 휴대폰 번호 인증 기능

### 👤 사용자 관리
- **회원가입**: 상세한 사용자 정보 입력 (이름, 닉네임, 생년월일, 성별, 휴대폰번호)
- **프로필 관리**: 사용자 정보 조회 및 수정
- **중복 확인**: 이메일, 닉네임, 휴대폰번호 중복 검사
- **OAuth2 사용자 자동 회원가입**: 소셜 로그인 시 자동 계정 생성

### 🛠️ 기술 스택

#### Backend
- **Spring Boot 3.x**: 메인 프레임워크
- **Spring Security**: 인증 및 권한 관리
- **Spring Data JPA**: 데이터베이스 접근
- **JWT**: 토큰 기반 인증
- **Redis**: 캐싱 및 세션 관리
- **MySQL**: 메인 데이터베이스
- **Maven**: 빌드 도구

#### Frontend
- **React 18**: 사용자 인터페이스
- **TypeScript**: 타입 안전성
- **Vite**: 빌드 도구
- **React Router**: 라우팅
- **CSS3**: 스타일링

## 🚀 빠른 시작

### 1. 백엔드 실행

```bash
# Maven으로 빌드
mvn clean install

# Spring Boot 애플리케이션 실행
mvn spring-boot:run
```

### 2. 프론트엔드 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 3. Docker로 실행

```bash
# Docker Compose로 전체 서비스 실행
docker-compose up -d
```

## ⚙️ 환경 설정

### Backend 설정 (application-dev.properties)

```properties
# 데이터베이스 설정
spring.datasource.url=jdbc:mysql://localhost:3306/fitmate
spring.datasource.username=your_username
spring.datasource.password=your_password

# JWT 설정
jwt.secret=your_jwt_secret_key
jwt.expiration=86400000

# Redis 설정
spring.redis.host=localhost
spring.redis.port=6379

# OAuth2 설정
oauth2.google.client-id=your_google_client_id
oauth2.google.client-secret=your_google_client_secret
oauth2.naver.client-id=your_naver_client_id
oauth2.naver.client-secret=your_naver_client_secret
oauth2.kakao.client-id=your_kakao_client_id
oauth2.kakao.client-secret=your_kakao_client_secret
```

### Frontend 설정 (frontend/src/config/api.ts)

```typescript
export const API_ENDPOINTS = {
  BASE_URL: 'http://localhost:8080/api',
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  OAUTH2_AUTHORIZATION: (provider: string) => 
    `http://localhost:8080/oauth2/authorization/${provider}`,
  // ... 기타 엔드포인트
};
```

## 📋 API 엔드포인트

### 인증 관련 API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | 이메일/비밀번호 로그인 |
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/send-verification-email` | 이메일 인증 코드 발송 |
| POST | `/api/auth/verify-email-code` | 이메일 인증 코드 확인 |
| POST | `/api/auth/verify-phone` | 휴대폰 인증 |
| GET | `/api/auth/check-email` | 이메일 중복 확인 |
| GET | `/api/auth/profile` | 사용자 프로필 조회 |
| POST | `/api/auth/logout` | 로그아웃 |

### OAuth2 관련 API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oauth2/authorization/{provider}` | OAuth2 인증 시작 |
| GET | `/api/oauth2/login-success` | OAuth2 로그인 성공 처리 |
| GET | `/api/oauth2/login-failure` | OAuth2 로그인 실패 처리 |

## 🗄️ 데이터베이스 스키마

### User 테이블

```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    nickname VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    birth_date VARCHAR(255),
    gender VARCHAR(10),
    phone_number VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    profile_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🔧 개발 명령어

### Backend
```bash
# 개발 서버 실행
mvn spring-boot:run

# 테스트 실행
mvn test

# 패키지 빌드
mvn clean package
```

### Frontend
```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 빌드 미리보기
npm run preview

# 타입 체크
npm run type-check
```

## 🐳 Docker 지원

```bash
# 전체 서비스 실행
docker-compose up -d

# 특정 서비스만 실행
docker-compose up -d mysql redis

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

## 🔐 보안 기능

- **JWT 토큰 인증**: 무상태 인증으로 확장성 확보
- **비밀번호 암호화**: BCrypt를 사용한 안전한 비밀번호 저장
- **CORS 설정**: 프론트엔드와 백엔드 간 안전한 통신
- **Redis 캐싱**: 사용자 정보 캐싱으로 성능 향상
- **OAuth2 보안**: 소셜 로그인 시 안전한 인증 처리

## 🚨 주의사항

1. **환경변수 설정**: `.env` 파일과 `application-dev.properties` 파일을 반드시 설정
2. **OAuth2 설정**: 각 소셜 로그인 제공자의 개발자 콘솔에서 올바른 리디렉션 URI 설정
3. **데이터베이스**: MySQL 서버가 실행 중이어야 함
4. **Redis**: 캐싱을 위해 Redis 서버 필요

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요. 