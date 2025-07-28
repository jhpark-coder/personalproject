# FitMate 프로젝트

Spring Boot 백엔드와 React 프론트엔드로 구성된 피트니스 매칭 플랫폼입니다.

## 🏗️ 아키텍처

### **백엔드 (Docker)**
- Spring Boot 애플리케이션
- MySQL 데이터베이스
- Redis 캐시
- 포트: 8080

### **프론트엔드 (로컬 개발)**
- React 애플리케이션
- 개발 서버: 5173
- API 통신: http://localhost:8080

## 🚀 빠른 시작

### 1. 백엔드 실행 (Docker)
```bash
# 백엔드 스택 실행 (MySQL, Redis, Spring Boot)
docker-compose up -d

# 로그 확인
docker-compose logs -f backend

# 중지
docker-compose down
```

### 2. 프론트엔드 실행 (로컬)
```bash
cd frontend
npm install
npm start
```

## 📁 프로젝트 구조

```
fitmate/
├── src/main/java/backend/fitmate/    # Spring Boot 백엔드
├── src/main/resources/               # 설정 파일
├── frontend/                         # React 프론트엔드 (로컬 개발)
├── Dockerfile                        # 백엔드 Docker 설정
├── docker-compose.yml               # 백엔드 스택 Docker 설정
└── README.md
```

## 🔧 환경 설정

### 프로필 설정
- `dev`: 개발 환경 (MySQL, Redis, 이메일 인증)
- `prod`: 운영 환경

### 데이터베이스 설정
- **개발**: MySQL (localhost:3306)
- **운영**: MySQL (운영 서버)

### Redis 설정
- **개발**: localhost:6379
- **운영**: 운영 Redis 서버

### 이메일 설정
- **SMTP**: Gmail (smtp.gmail.com:587)
- **인증**: 이메일 인증 코드 (6자리, 5분 유효)

## 🔐 소셜 로그인

### Google OAuth2
- Client ID: `581520849563-mragtke8gp7fdb83llmkhcdpnk2rrrg7.apps.googleusercontent.com`
- Redirect URI: `http://localhost:5173/auth/google/callback`

### Kakao OAuth2
- Client ID: `d9172ea77330ceeeabb05429a4af6c36`
- Redirect URI: `http://localhost:5173/auth/kakao/callback`

### Naver OAuth2
- Client ID: `Shnb5z_iDjpbIA67H7B_`
- Redirect URI: `http://localhost:5173/auth/naver/callback`

## 📧 이메일 인증

### API 엔드포인트
- `POST /api/auth/send-verification-email`: 인증 코드 발송
- `POST /api/auth/verify-email-code`: 인증 코드 검증
- `POST /api/auth/resend-verification-email`: 재발송

### 기능
- 6자리 랜덤 숫자 코드
- 5분 유효 기간 (Redis TTL)
- 자동 만료 처리

## 🐳 Docker 명령어

```bash
# 백엔드 스택 빌드 및 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up -d

# 특정 서비스만 실행
docker-compose up backend

# 로그 확인
docker-compose logs backend
docker-compose logs mysql
docker-compose logs redis

# 컨테이너 중지
docker-compose down

# 볼륨 포함 삭제
docker-compose down -v
```

## 🔍 포트 정보

- **백엔드**: http://localhost:8080
- **프론트엔드**: http://localhost:5173
- **MySQL**: localhost:3306
- **Redis**: localhost:6379

## 🛠️ 개발 도구

### 백엔드
- Spring Boot 3.5.4
- Spring Security
- Spring Data JPA
- Spring Data Redis
- Spring Mail
- MySQL 8.0

### 프론트엔드
- React 18
- TypeScript
- React Router DOM
- CSS3

## 📝 주의사항

1. **Gmail 앱 비밀번호**: 2단계 인증 후 앱 비밀번호 생성 필요
2. **CORS 설정**: 프론트엔드 (5173)에서 백엔드 (8080) 접근 허용
3. **MySQL 스키마**: `personalproject` 스키마 자동 생성
4. **배포 분리**: 백엔드와 프론트엔드는 별도 배포 권장

## 🚨 문제 해결

### 이메일 발송 실패
1. Gmail 앱 비밀번호 확인
2. 2단계 인증 활성화
3. 보안 수준이 낮은 앱 액세스 허용

### Redis 연결 실패
```bash
# Redis 서버 실행 확인
docker-compose logs redis
```

### MySQL 연결 실패
```bash
# MySQL 서버 실행 확인
docker-compose logs mysql
```

### 프론트엔드 API 연결 실패
```bash
# 백엔드 서버 실행 확인
docker-compose logs backend
``` 