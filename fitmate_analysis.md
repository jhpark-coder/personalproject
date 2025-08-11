# Fitmate 프로젝트 분석 보고서

## 1. 프로젝트 개요

**Fitmate**는 AI 기반의 개인 맞춤형 피트니스 코칭 및 건강 관리 플랫폼입니다. 사용자는 AI 모션 코칭을 통해 운동 자세를 교정받고, 신체 데이터를 기록 및 분석하며, 트레이너나 다른 사용자와 실시간으로 소통할 수 있습니다.

본 프로젝트는 MSA(Microservice Architecture)와 유사한 구조로, 기능에 따라 여러 서버가 독립적으로 구성되어 있습니다.

- **Core API (Backend)**: 사용자 정보, 운동 데이터 등 핵심 비즈니스 로직 처리
- **Web App (Frontend)**: 사용자 인터페이스 및 AI 코칭 기능 제공
- **Communication Server**: 실시간 채팅 및 푸시 알림 기능 담당

이 모든 서비스는 Docker 컨테이너 환경에서 동작하며, Nginx가 Reverse Proxy 역할을 수행하여 각 서버로 요청을 분배합니다.

## 2. 구현된 주요 기능

파일 및 폴더 구조를 기반으로 분석한 현재 구현된 기능은 다음과 같습니다.

### 🤸 AI 기반 운동 코칭
- **실시간 자세 분석**: 웹캠을 통해 사용자의 운동 자세를 인식하고 분석 (`MotionCoach.tsx`, `PoseDetector.tsx`).
- **운동 테스트 및 정보 제공**: 다양한 운동에 대한 테스트 및 상세 정보 제공 (`ExerciseTest.tsx`, `ExerciseInformation.tsx`).

### 👤 사용자 관리 및 인증
- **회원가입 및 로그인**: 자체 회원가입 및 로그인 기능 (`SignupForm.tsx`, `MemberForm.tsx`).
- **소셜 로그인**: Google/Kakao/Naver OAuth2 간편 로그인 (`SecurityConfig`, `application-*.properties`).
- **인증 관리**: 특정 페이지에 대한 접근을 제어하는 `AuthGuard.tsx` 컴포넌트.
- **온보딩 프로세스**: 신규 사용자를 위한 단계별 초기 설정(기본 정보, 목표, 경험 등) (`onboarding/`).

### 💬 실시간 채팅 및 알림
- **실시간 메시징**: Socket.IO 기반 채팅 (`ChatPage.tsx`, `ChatRoom.tsx`, NestJS Gateway).
- **채팅 대시보드**: 채팅방 목록 및 통계 (`ChatDashboard.tsx`).
- **푸시/알림**: 서버에서 클라이언트로 알림 전송 (`NotificationCenter.tsx`, `notification-scheduler.service.ts`).
- **SMS 발송**: Twilio API 사용 (`communication-server/src/sms`).

### 📊 대시보드 및 데이터 분석
- **개인 프로필 및 기록**: 신체 정보(체중, 근육량 등) 기록 및 관리 (`Profile.tsx`, `BodyRecordForm.tsx`).
- **운동 통계**: 운동 기록 및 성과 시각화 (`analytics/WorkoutStats.tsx`, `recharts`).
- **캘린더 연동**: Google Calendar API 연동, 운동 계획/기록 관리 (`Calendar.tsx`, 백엔드 Google API 연동).

## 3. 기술 스택

### Backend (Core API)
- **언어/런타임**: Java 21
- **프레임워크**: Spring Boot 3.5.4
- **핵심 스타터**:
  - `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-oauth2-client`
  - `spring-boot-starter-data-redis` (Redis 연동), `spring-boot-starter-quartz` (스케줄링)
  - `spring-boot-starter-webflux` (Firebase REST 등 비동기 HTTP 클라이언트 용도)
- **보안/인증**:
  - JWT: `io.jsonwebtoken:jjwt-* 0.11.5`
  - OAuth2: Google/Kakao/Naver 클라이언트 설정 (`application-dev.properties`, `application-prod.properties`)
- **레이트 리밋**: `bucket4j` (Redis 저장소 연동, lettuce)
- **구글 캘린더 연동**:
  - `com.google.apis:google-api-services-calendar v3-rev20230707-2.0.0`
  - `com.google.api-client:google-api-client 2.0.0`
  - `com.google.auth:* 1.19.0`
- **Firebase Admin**: `com.google.firebase:firebase-admin 9.1.1`
- **Lombok**: 코드 보일러플레이트 제거
- **빌드 도구**: Maven

### 데이터베이스/스토리지 (정확)
- **메인 RDB (백엔드)**: MySQL 8.0
  - 드라이버: `com.mysql:mysql-connector-j`
  - Dev/Prod 설정: `application-dev.properties`/`application-prod.properties`에서 MySQL JDBC URL 사용
  - Docker: `mysql:8.0` 서비스 사용 (루트 `docker-compose.yml`)
- **실시간 서비스 DB (커뮤니케이션 서버)**: MongoDB
  - ODM: `mongoose ^8.0.0`
  - Docker: `mongo:7` (루트), `mongo:6.0` (통신 서버 단독 compose)
- **캐시/레이트 리밋/OTP**: Redis 7 (Docker `redis:7-alpine`)
  - 백엔드: Spring Data Redis + Lettuce (`RedisConfig.java`, CacheManager 구성)
  - 커뮤니케이션 서버: `ioredis ^5.7.0` 사용 (`RedisService`)

### Frontend (Web App)
- **언어**: TypeScript 5.5+
- **프레임워크/런타임**: React 19.1.1, React DOM 19.1.1
- **라우팅**: `react-router-dom 7.7.1`
- **차트**: `recharts 3.1.0`
- **실시간**: `socket.io-client 4.8.1`
- **AI/포즈 추정**: `@mediapipe/pose 0.5.x`
  - `PoseDetector.tsx`에서 `Pose`를 jsDelivr CDN으로 로드하여 사용 (TensorFlow.js 비사용)
- **아이콘**: `lucide-react`
- **인증/클라이언트 서비스**: `firebase 12.x` (클라이언트 SDK 포함)
- **빌드 도구**: Vite 7, `@vitejs/plugin-react`, ESLint

### Communication Server (Real-time)
- **언어/런타임**: TypeScript (Node.js)
- **프레임워크**: NestJS 11.x
- **실시간 통신**: Socket.IO (`@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io 4.8.1`)
- **DB/ODM**: MongoDB + `mongoose 8`
- **캐시/레이트 리밋/OTP**: `ioredis 5.7.0`
- **스케줄러**: `@nestjs/schedule`
- **SMS**: `twilio 5.8.0`

### DevOps / Infrastructure
- **컨테이너화**: Docker
- **Compose 오케스트레이션**: `docker-compose.yml`
- **Reverse Proxy**: Nginx (`nginx/nginx.conf`)
- **네트워크**: 단일 브리지 네트워크 `fitmate-network`

## 4. 아키텍처

1. **클라이언트 → Nginx**: 모든 HTTP/WS 트래픽은 Nginx로 유입.
2. **라우팅 (Reverse Proxy)**
   - `/api/**` → Spring Boot Backend (`backend:8080`)
   - `/sms/**`, `/socket.io/**` → Communication Server (`communication-server:3000`, WS 업그레이드 포함)
   - `/` → 정적 파일 서빙 (프론트엔드 빌드 산출물)
3. **서버 간 통신/스토리지**
   - Backend ↔ MySQL 8 (영속 데이터)
   - Communication Server ↔ MongoDB (채팅, 알림 문서 저장)
   - Backend/Communication ↔ Redis (캐시, OTP, 레이트 리밋, Pub/Sub 가능 구조)
4. **컨테이너 서비스/포트 (루트 compose)**
   - `nginx:80` 외부 개방
   - `backend:8080`, `communication-server:3000`
   - `mysql:3306`, `mongo:27017`, `redis:6379`

## 5. 설정 요약 (Dev/Prod)

- 활성 프로파일: `spring.profiles.active=dev` (기본)
- Dev/Prod 공통 JWT
  - `jjwt` 기반 서명, 만료 `jwt.expiration=86400000`
- OAuth2 제공자
  - Google/Kakao/Naver 클라이언트 등록 및 리다이렉트 URI 환경 변수화 지원
- CORS
  - 허용 오리진: `http://localhost:5173`, `https://localhost:5173` (백엔드 `SecurityConfig`)
- Redis (Dev)
  - `spring.data.redis.host=localhost`, `port=6379`
- 프론트엔드 API 엔드포인트 (`frontend/src/config/api.ts`)
  - 기본 백엔드: `http://localhost:8080`
  - 통신 서버: `http://localhost:3000`

## 6. 보안/운영 주의 사항

- 저장소에 민감 값(JWT secret, OAuth client secret, Twilio 토큰 등)이 설정 파일과 compose에 포함되어 있음.
  - 운영 환경에서는 환경 변수/비밀 관리(예: Docker secrets, Vault, GitHub Actions secrets)로 분리 권장.
  - `application-prod.properties`에선 민감 값의 환경변수 주입 사용을 확대 권장.
- Nginx는 기본 HTTP(80)로 리스닝. 실서비스는 HTTPS 종단(로드밸런서/인증서) 구성 필요.
