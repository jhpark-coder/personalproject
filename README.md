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

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│          React 19 + TypeScript + MediaPipe               │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼────────────────────────────────────┐
│                 Nginx (Port 80/443)                      │
│              Load Balancer & Reverse Proxy               │
└──────┬──────────────┬─────────────────┬─────────────────┘
       │ /api/*       │ /sms/*          │ /socket.io
┌──────▼────────┐ ┌───▼──────────┐ ┌───▼─────────────────┐
│  Spring Boot  │ │    NestJS    │ │   WebSocket Server  │
│  Port 8080    │ │  Port 3000   │ │    (Socket.IO)      │
└──────┬────────┘ └───┬──────────┘ └─────────────────────┘
       │              │
┌──────▼────────┐ ┌───▼──────────┐ ┌─────────────────────┐
│     MySQL     │ │   MongoDB    │ │       Redis         │
│  (User Data)  │ │(Chat/Notify) │ │  (Cache/Session)    │
└───────────────┘ └──────────────┘ └─────────────────────┘
```

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

### 인증 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/login` | 일반 로그인 |
| POST | `/api/auth/signup` | 회원가입 |
| GET | `/api/auth/profile` | 프로필 조회 |
| POST | `/api/auth/logout` | 로그아웃 |
| POST | `/api/auth/save-onboarding-profile` | 온보딩 프로필 저장 |

### OAuth2 소셜 로그인
| Provider | Authorization URL | Callback URL |
|----------|------------------|--------------|
| Google | `/oauth2/authorization/google` | `/login/oauth2/code/google` |
| Kakao | `/oauth2/authorization/kakao` | `/login/oauth2/code/kakao` |
| Naver | `/oauth2/authorization/naver` | `/login/oauth2/code/naver` |

### 운동 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/exercises` | 운동 목록 조회 |
| GET | `/api/exercises/{id}` | 운동 상세 정보 |
| POST | `/api/workout/session` | 운동 세션 시작 |
| POST | `/api/workout/feedback` | 운동 피드백 저장 |
| GET | `/api/workout/history` | 운동 기록 조회 |
| POST | `/api/workout/recommend` | AI 운동 추천 |

### 실시간 통신 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/sms/send` | SMS 발송 |
| POST | `/sms/request-otp` | OTP 요청 |
| POST | `/sms/verify-otp` | OTP 검증 |
| WS | `/socket.io` | WebSocket 연결 |
| POST | `/api/notifications/create` | 알림 생성 |

### 사용자 데이터 API
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/users/body-records` | 신체 기록 조회 |
| POST | `/api/users/body-records` | 신체 기록 저장 |
| GET | `/api/users/calendar` | 캘린더 데이터 조회 |
| POST | `/api/users/update-profile` | 프로필 업데이트 |



## 📞 문의

- **이메일**: pjh133765@gmail.com
- **GitHub Issues**: [버그 리포트](https://github.com/jhpark-coder/personalproject/issues)

---

<div align="center">

**Built with ❤️ by FitMate Team**

</div>