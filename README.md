# FitMate - AI 기반 개인 맞춤 운동 플랫폼

## 📋 프로젝트 개요

FitMate는 AI 기술을 활용한 개인 맞춤형 운동 플랫폼입니다. 사용자의 신체 정보, 운동 경험, 목표를 분석하여 최적의 운동 프로그램을 제공하고, 실시간 알림과 소셜 기능을 통해 지속적인 운동 습관 형성을 돕습니다.

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Frontend      │    │   Backend        │    │ Communication    │
│   (React)       │◄──►│   (Spring Boot)  │◄──►│   Server         │
│                 │    │                  │    │   (NestJS)       │
└─────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   MongoDB       │    │   Redis Cache    │    │   Twilio SMS     │
│   (User Data)   │    │   (Session)      │    │   (Notifications)│
└─────────────────┘    └──────────────────┘    └──────────────────┘
```

## 🛠️ 기술 스택

### Frontend
- **React 18** - 사용자 인터페이스
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **Socket.IO Client** - 실시간 통신
- **Pose Detection** - 자세 인식

### Backend (Spring Boot)
- **Spring Boot 3** - 메인 백엔드
- **Spring Security** - 인증/인가
- **Spring Data JPA** - 데이터 접근
- **JWT** - 토큰 기반 인증
- **OAuth2** - 소셜 로그인 (Google, Kakao, Naver)
- **Redis** - 세션 캐싱

### Communication Server (NestJS)
- **NestJS** - 실시간 통신 서버
- **Socket.IO** - WebSocket 통신
- **MongoDB** - 채팅/알림 데이터
- **Twilio** - SMS 알림 서비스
- **@nestjs/schedule** - 스케줄러

### Database
- **MongoDB** - 채팅, 알림, 운동 데이터
- **MySQL/PostgreSQL** - 사용자, 운동 기록 데이터
- **Redis** - 세션, 캐시 데이터

### DevOps
- **Docker** - 컨테이너화
- **Docker Compose** - 멀티 컨테이너 관리
- **Git** - 버전 관리

## 🚀 주요 기능

### 1. 사용자 관리
- **회원가입/로그인** - OAuth2 소셜 로그인 지원
- **프로필 관리** - 개인 정보 및 운동 목표 설정
- **온보딩** - 초기 신체 정보 및 운동 경험 입력
- **권한 관리** - 일반 사용자, 관리자 역할

### 2. AI 운동 추천 시스템
- **개인 맞춤 운동** - 신체 정보 기반 AI 추천
- **운동 난이도 조절** - 경험 수준에 따른 자동 조정
- **목표 기반 프로그램** - 체중 감량, 근력 향상 등 목표별 맞춤
- **실시간 피드백** - 자세 인식을 통한 운동 가이드

### 3. 운동 기록 관리
- **운동 일지** - 일일 운동 기록 및 통계
- **진도 추적** - 운동 성과 및 개선도 측정
- **목표 달성** - 단계별 목표 설정 및 달성 확인
- **운동 히스토리** - 과거 운동 데이터 분석

### 4. 실시간 알림 시스템
- **SMS 알림** - Twilio 기반 문자 메시지
- **사이트 알림** - 실시간 웹 알림
- **스케줄러** - 자동 알림 발송 시스템
- **알림 설정** - 사용자별 알림 선호도 관리

### 5. 소셜 기능
- **친구 시스템** - 운동 파트너 찾기
- **랭킹 시스템** - 운동 성과 기반 순위
- **운동 공유** - 운동 인증 및 공유
- **커뮤니티** - 운동 팁 및 경험 공유

### 6. 실시간 채팅
- **1:1 채팅** - 개인 메시지
- **그룹 채팅** - 운동 그룹 대화
- **관리자 상담** - 고객 지원 채팅
- **실시간 알림** - 메시지 수신 알림

### 7. 데이터 분석
- **운동 통계** - 개인 운동 데이터 분석
- **성과 리포트** - 주간/월간 운동 요약
- **AI 인사이트** - 운동 패턴 분석 및 개선 제안
- **목표 진행도** - 목표 달성률 시각화

### 8. 운동 데이터 관리
- **MET 데이터 매핑** - CSV 기반 MET 값 및 강도 매핑 자동화
- **초기 운동 세트 제공** - 헬스장에서 수행 가능한 대표 운동 내장
- **수동 업데이트 없음** - 외부 Wger API 연동 제거로 네트워크 의존성 최소화

## 🔄 최근 개선 사항 (2025-08-08)

- **CORS 개선 (요청 오리진 반사 허용)**: `communication-server/src/main.ts`
  - 개발 환경에서 `'*'`가 허용 오리진 목록에 포함되면 `origin: true`로 동작하여 브라우저 요청 오리진을 그대로 반사합니다.
- **Nginx 프록시 추가**: `nginx/nginx.conf`
  - `location /sms/`를 `communication-server:3000`으로 프록시하여 프론트가 상대경로(`/sms/...`)로도 통신 서버에 접근 가능.
- **프론트 통신 서버 URL 폴백**: `frontend/src/config/api.ts`
  - 환경변수 미설정 시 `CHAT_SERVER_URL`을 항상 `http://localhost:3000`으로 폴백.
- **Twilio OTP 요청 안정성 강화**: `frontend/src/components/SignupForm.tsx`
  - OTP 요청 시 `response.ok`와 `content-type`을 검사해 HTML 오류 페이지 수신 시에도 안전하게 에러 처리.

## 🔧 설치 및 실행

### 1. 환경 설정
```bash
# 환경 변수 파일 생성 (예시)
cp .env.example communication-server/.env.development
# Twilio 자격증명과 Redis, MongoDB, 프록시 대상 등을 설정하세요.
```

### 2. 의존성 설치
```bash
# Frontend
cd frontend
npm install

# Backend (Spring Boot)
cd ..
./mvnw install

# Communication Server (NestJS)
cd communication-server
npm install
```

### 3. 프론트 빌드 (Nginx가 정적 파일을 서빙)
```bash
cd frontend
npm run build
```

### 4. Docker로 전체 스택 실행
```bash
cd ..
docker compose up -d --build
```
- 접속: `http://localhost`
- 프론트는 Nginx 컨테이너에서 `frontend/dist` 정적 파일로 서빙됩니다.
- `/sms/*` 요청은 Nginx가 통신 서버(`communication-server:3000`)로 프록시합니다.

## 📱 API 엔드포인트

### SMS API (Communication Server)
- `POST /sms/send` - 기본 SMS 발송
- `POST /sms/workout-recommendation` - 운동 추천 SMS
- `POST /sms/custom` - 맞춤형 SMS
- `POST /sms/health` - SMS 서비스 상태 확인
- `POST /sms/request-otp` - OTP 인증 코드 요청
- `POST /sms/verify-otp` - OTP 인증 코드 검증

### 알림 API (Communication Server)
- `POST /api/notifications/create` - 알림 생성
- `GET /api/notifications/user/:userId` - 사용자 알림 조회
- `PUT /api/notifications/:id/read` - 알림 읽음 처리
- `GET /api/notifications/user/:userId/unread-count` - 읽지 않은 알림 개수

## 🐳 Docker 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f communication-server
```

## 📊 모니터링

### 로그 확인
```bash
# Communication Server 로그 (개발 모드)
cd communication-server
npm run start:dev

# 주요 로그 메시지
🚀 통신 서버가 실행 중입니다: http://localhost:3000
📡 WebSocket 서버: ws://localhost:3000
🌐 CORS 허용 도메인: [reflect request origin] 또는 허용 목록
```

### 성능 모니터링
- **SMS 발송 성공률** - Twilio API 응답 확인
- **스케줄러 실행 상태** - Cron 작업 실행 로그
- **WebSocket 연결 상태** - 실시간 통신 상태
- **데이터베이스 연결** - MongoDB 연결 상태

## 🔒 보안

### 환경 변수 보안
- Twilio 자격증명, DB 비밀번호 등 민감한 정보는 `.env`로 관리하고 Git에 커밋하지 마세요.
- 프로덕션에서는 와일드카드 CORS(`*`)를 사용하지 마세요.

### API 보안
- **JWT 인증**: 토큰 기반 사용자 인증
- **CORS 설정**: 허용된 도메인만 접근 (개발 외 환경에서 화이트리스트 사용)
- **Rate Limiting**: OTP 요청 등 민감 API에 요청 제한

## 🚀 배포

### 개발 환경
```bash
# 개발 모드 실행 (개별)
cd frontend && npm run dev
cd communication-server && npm run start:dev
```

### 프로덕션 환경
```bash
# 프론트 빌드
cd frontend && npm run build

# Docker로 배포
cd .. && docker compose up -d --build
```

## 📈 향후 개발 계획

### 단기 계획 (1-2개월)
- [ ] 사용자 데이터베이스 연동
- [ ] 실제 운동 데이터 기반 알림
- [ ] 사용자 알림 설정 관리
- [ ] AI 운동 추천 알고리즘 개선

### 중기 계획 (3-6개월)
- [ ] 모바일 앱 개발 (React Native)
- [ ] 고급 분석 기능 추가
- [ ] 소셜 기능 확장
- [ ] 성능 최적화

### 장기 계획 (6개월 이상)
- [ ] 머신러닝 기반 개인화
- [ ] 웨어러블 기기 연동
- [ ] 다국어 지원
- [ ] 엔터프라이즈 버전

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

- **프로젝트 관리자**: [이메일 주소]
- **기술 문의**: [이메일 주소]
- **버그 리포트**: GitHub Issues

---

**FitMate** - AI와 함께하는 건강한 운동 라이프스타일 🏃‍♂️💪 