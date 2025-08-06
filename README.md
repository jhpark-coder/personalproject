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

## 📅 오늘 개발한 기능 (2025-08-06)

### 1. Twilio SMS 연동
- **환경 설정**: `.env.development` 파일 구성
- **SMS 서비스**: 기본 SMS, 운동 추천, 맞춤형 메시지 발송
- **에러 처리**: SMS 발송 실패 시 적절한 에러 핸들링
- **보안**: Twilio 자격 증명 안전한 관리

### 2. 스케줄러 시스템
- **@nestjs/schedule** 패키지 설치 및 설정
- **자동 알림 발송**: 설정된 시간에 자동 SMS/알림 발송
- **비용 효율적 설계**: SMS는 핵심 기능에만, 사이트 알림은 무제한 사용

### 3. 알림 스케줄러 기능
- **매일 오전 9시 운동 알림** - SMS + 사이트 알림
- **매주 일요일 오후 6시 주간 리포트** - SMS + 사이트 알림
- **매일 자정 목표 달성 확인** - 사이트 알림만
- **매일 오후 3시 운동 습관 형성 알림** - 사이트 알림만

### 4. 환경 변수 관리
- **개발 환경**: `.env.development` 설정
- **프로덕션 환경**: `.env.production` 설정
- **ConfigModule**: NestJS 환경 변수 관리
- **보안**: 민감한 정보 환경 변수로 관리

## 🔧 설치 및 실행

### 1. 환경 설정
```bash
# 환경 변수 파일 생성
cp .env.example .env.development
cp .env.example .env.production

# 환경 변수 설정
NODE_ENV=development
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 2. 의존성 설치
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../src
./mvnw install

# Communication Server
cd ../communication-server
npm install
```

### 3. 데이터베이스 설정
```bash
# MongoDB 실행
docker-compose up -d mongo

# Redis 실행
docker-compose up -d redis
```

### 4. 서버 실행
```bash
# Frontend (개발 모드)
cd frontend
npm run dev

# Backend (Spring Boot)
cd ../src
./mvnw spring-boot:run

# Communication Server
cd ../communication-server
npm run start:dev
```

## 📱 API 엔드포인트

### SMS API (Communication Server)
- `POST /sms/send` - 기본 SMS 발송
- `POST /sms/workout-recommendation` - 운동 추천 SMS
- `POST /sms/custom` - 맞춤형 SMS
- `POST /sms/health` - SMS 서비스 상태 확인

### 알림 API (Communication Server)
- `POST /api/notifications/create` - 알림 생성
- `GET /api/notifications/user/:userId` - 사용자 알림 조회
- `PUT /api/notifications/:id/read` - 알림 읽음 처리
- `GET /api/notifications/user/:userId/unread-count` - 읽지 않은 알림 개수

### WebSocket 이벤트
- `joinChat` - 채팅 참가
- `sendMessage` - 메시지 전송
- `getHistory` - 채팅 내역 조회
- `joinAsAdmin` - 관리자로 참가

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
# Communication Server 로그
npm run start:dev

# 주요 로그 메시지
🏃‍♂️ 일일 운동 알림 스케줄러 실행
📊 주간 리포트 스케줄러 실행
🎯 목표 달성 확인 스케줄러 실행
💪 운동 습관 형성 알림 스케줄러 실행
```

### 성능 모니터링
- **SMS 발송 성공률** - Twilio API 응답 확인
- **스케줄러 실행 상태** - Cron 작업 실행 로그
- **WebSocket 연결 상태** - 실시간 통신 상태
- **데이터베이스 연결** - MongoDB 연결 상태

## 🔒 보안

### 환경 변수 보안
- **민감한 정보**: Twilio 자격 증명, 데이터베이스 비밀번호
- **개발/프로덕션 분리**: 환경별 설정 파일 분리
- **Git 무시**: `.env` 파일 Git 추적 제외

### API 보안
- **JWT 인증**: 토큰 기반 사용자 인증
- **CORS 설정**: 허용된 도메인만 접근
- **Rate Limiting**: API 요청 제한

## 🚀 배포

### 개발 환경
```bash
# 개발 모드 실행
npm run start:dev
```

### 프로덕션 환경
```bash
# 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

### Docker 배포
```bash
# 이미지 빌드
docker build -t fitmate-communication-server .

# 컨테이너 실행
docker run -d -p 3001:3001 fitmate-communication-server
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