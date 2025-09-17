# 💪 FitMate - AI Fitness Platform

<div align="center">

![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.5-brightgreen?logo=springboot)
![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)
![NestJS](https://img.shields.io/badge/NestJS-11.0.1-E0234E?logo=nestjs)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

**실시간 자세 감지와 맞춤형 운동 추천을 위한 AI 피트니스 플랫폼**

[🚀 시작하기](#-빠른-시작) • [📚 문서](#-프로젝트-구조) • [💡 기능](#-주요-기능)

</div>

---

## 📌 프로젝트 소개

**FitMate**는 MediaPipe 기반 실시간 자세 감지와 맞춤형 운동 추천을 제공하는 피트니스 플랫폼입니다. 사용자의 운동 데이터를 분석하여 개인화된 운동 프로그램을 제공하며, 실시간 모션 코칭을 통해 정확한 운동 자세를 유도합니다.

## 🏗️ 시스템 아키텍처

### Frontend
- **React 19**: SPA 기반 사용자 인터페이스
- **MediaPipe**: 실시간 자세 감지 (30fps)
- **TypeScript**: 타입 안정성

### Backend
- **Spring Boot** (Port 8080): 메인 API 서버
- **NestJS** (Port 3000): WebSocket 실시간 통신
- **MySQL**: 사용자 데이터 저장
- **MongoDB**: 채팅/알림 데이터
- **Redis**: 세션 캐싱 및 레이트 리미팅

### Infrastructure
- **Docker Compose**: 전체 스택 컨테이너화
- **Nginx**: 리버스 프록시 및 로드 밸런싱
- **AWS ECS**: 프로덕션 배포 (옵션)

## 💡 주요 기능

### 🤖 AI 모션 코칭
- 17가지 운동 자세 실시간 분석
- MediaPipe Pose 33포인트 트래킹
- TTS 음성 피드백

### 🏋️ 운동 관리
- 맞춤형 운동 프로그램 추천
- 운동 기록 및 진도 추적
- 칼로리 계산 및 통계

### 🔐 인증 시스템
- OAuth2 소셜 로그인 (Google, Kakao, Naver)
- JWT 기반 인증
- 프로필 관리 및 온보딩

### 💬 실시간 기능
- WebSocket 기반 실시간 채팅
- SMS 알림 (Twilio)
- 푸시 알림

## 🚀 빠른 시작

### Prerequisites
- Node.js 18+
- Java 21
- Docker & Docker Compose
- MySQL 8.0

### 설치 및 실행

1. 저장소 클론
2. 환경 변수 설정 (.env.example 참조)
3. Docker Compose로 실행

## 📁 프로젝트 구조

```
fitmate/
├── frontend/                # React 애플리케이션
│   ├── src/
│   │   ├── components/     # UI 컴포넌트
│   │   ├── features/       # 기능별 모듈
│   │   └── utils/         # 유틸리티
│   └── package.json
├── src/                    # Spring Boot 백엔드
│   └── main/
│       ├── java/          # Java 소스
│       └── resources/     # 설정 파일
├── communication-server/   # NestJS 통신 서버
│   ├── src/
│   └── package.json
├── docker-compose.yml     # Docker 구성
└── nginx/                 # Nginx 설정
```

## 🛠️ 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| **Frontend** | React, TypeScript, Vite | 19.1.1, 5.5.0, 7.0.6 |
| **Backend** | Spring Boot, Java | 3.5.5, 21 |
| **Communication** | NestJS, Socket.IO | 11.0.1, 4.8.1 |
| **Database** | MySQL, MongoDB, Redis | 8.0, 7, 7 |
| **AI/ML** | MediaPipe | 0.10.22 |
| **DevOps** | Docker, Nginx | Latest |

## 📊 API 문서

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/signup` - 회원가입
- `GET /api/auth/profile` - 프로필 조회

### 운동
- `GET /api/exercises` - 운동 목록
- `POST /api/workout/session` - 운동 세션 시작
- `POST /api/workout/feedback` - 운동 피드백

### 실시간 통신
- `POST /sms/send` - SMS 발송
- `POST /sms/request-otp` - OTP 요청
- `WS /socket.io` - WebSocket 연결



## 📝 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

## 📞 문의

- **이메일**: pjh133765@gmail.com
- **GitHub Issues**: [버그 리포트](https://github.com/jhpark-coder/personalproject/issues)

---

<div align="center">

**Built with ❤️ by FitMate Team**

</div>