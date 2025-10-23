# FitMate - AI 기반 개인 맞춤 운동 플랫폼

## 📋 프로젝트 개요

FitMate는 AI 기술을 활용한 개인 맞춤형 운동 플랫폼입니다. 사용자의 신체 정보, 운동 경험, 목표를 분석하여 최적의 운동 프로그램을 제공하고, 실시간 알림과 자세 인식 기반 코칭으로 지속적인 운동 습관 형성을 돕습니다.

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

### 5. 실시간 채팅
- **1:1 채팅** - 개인 메시지
- **그룹 채팅** - 운동 그룹 대화
- **관리자 상담** - 고객 지원 채팅
- **실시간 알림** - 메시지 수신 알림

### 6. 모션 코칭(자세 인식)
- **웹캠 기반 포즈 인식** - MediaPipe Pose 사용
- **실시간 오버레이** - 관절점/라인 시각화
- **운동 분석/카운트** - 스쿼트/런지/푸시업/플랭크/카프 레이즈 지원
- **대시보드 연동** - 메인에서 ‘운동 시작하기’ 클릭 시 바로 모션 코칭 진입

### 7. 데이터 분석
- **운동 통계** - 개인 운동 데이터 분석
- **성과 리포트** - 주간/월간 운동 요약
- **AI 인사이트** - 운동 패턴 분석 및 개선 제안
- **목표 진행도** - 목표 달성률 시각화

### 8. 운동 데이터 관리
- **MET 데이터 매핑** - CSV 기반 MET 값 및 강도 매핑 자동화
- **초기 운동 세트 제공** - 헬스장에서 수행 가능한 대표 운동 내장
- **수동 업데이트 없음** - 외부 Wger API 연동 제거로 네트워크 의존성 최소화

## 🔄 최근 개선 사항 (2025-08-12)

- **MotionCoach 통합**: `frontend/src/components/MotionCoach.tsx`
  - `PoseDetector`의 포즈 인식/오버레이/운동 분석 기능을 `MotionCoach`로 통합.
  - 대시보드의 ‘운동 시작하기’ 버튼에서 바로 진입하도록 연결.
- **UI/스타일 정리**: `MotionCoach.css`, `pose-detection/PoseDetector.css`
  - 시작 버튼, 분석 패널, 디버그 패널 스타일 정비.
- **Docker 리소스 정리 가이드 및 실행**
  - 안전 프룬 명령으로 미사용 볼륨/네트워크/컨테이너/이미지 정리.

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

### 성능 모니터링
- **SMS 발송 성공률** - Twilio API 응답 확인
- **스케줄러 실행 상태** - Cron 작업 실행 로그
- **WebSocket 연결 상태** - 실시간 통신 상태
- **데이터베이스 연결** - MongoDB 연결 상태

## 🔒 보안
### API 보안
- **JWT 인증**: 토큰 기반 사용자 인증
- **CORS 설정**: 허용된 도메인만 접근 (개발 외 환경에서 화이트리스트 사용)
- **Rate Limiting**: OTP 요청 등 민감 API에 요청 제한

### ▶️ 빠른 접근(모션 코칭)
- 대시보드에서 `운동 시작하기` 버튼 클릭 → 모션 코칭 화면 진입(`/motion`)
- 카메라 권한 허용 후 웹캠 위로 관절 오버레이 및 실시간 분석 표시

## 📞 문의

- **기술 문의**: [pjh133765@gmail.com]
---

**FitMate** - AI와 함께하는 건강한 운동 라이프스타일 🏃‍♂️💪 
