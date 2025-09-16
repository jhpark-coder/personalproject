# FitMate - AI 피트니스 플랫폼

<p align="center">
  <img src="https://img.shields.io/badge/React-19.1.1-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.5.5-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-11.0.1-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS-ECS-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white" />
</p>

<p align="center">
  <strong>실시간 자세 감지와 맞춤형 운동 추천</strong>
</p>

## 🎯 프로젝트 소개

FitMate는 MediaPipe 기반 실시간 자세 감지와 맞춤형 운동 추천을 제공하는 종합 피트니스 플랫폼입니다.

### ✨ 핵심 기능

- **🏋️ 17가지 운동 지원**: 
  - 하체: 스쿼트, 런지, 종아리 운동, 점프 스쿼트, 데드리프트, 월싯, 브릿지
  - 상체: 푸시업, 풀업
  - 코어: 플랭크, 사이드 플랭크, 싯업, 크런치
  - 유산소: 버피, 마운틴 클라이머, 점핑잭, 하이니즈
- **📹 실시간 자세 감지**: MediaPipe로 30fps에서 97% 이상 정확도
- **🤖 맞춤형 추천**: 사용자 프로필과 진도에 기반한 운동 프로그램
- **🔐 OAuth2 인증**: Google, Kakao, Naver 소셜 로그인 지원
- **💬 실시간 통신**: WebSocket 채팅 및 SMS 알림 (Twilio)
- **📊 진도 분석**: 상세한 운동 기록 및 신체 측정 추적
- **📱 모바일 최적화**: 터치 친화적 인터페이스의 반응형 디자인
- **☁️ 클라우드 배포**: 자동 확장 및 로드 밸런싱 기능의 AWS ECS

---

## 🏗️ 시스템 아키텍처

- **Frontend**: React 19 + TypeScript + MediaPipe
- **Backend**: Spring Boot + NestJS 마이크로서비스
- **Database**: MySQL + MongoDB + Redis
- **Infrastructure**: Docker + AWS ECS + Nginx

---

## 💪 주요 기능

### 운동 시스템
- 17가지 운동 실시간 자세 감지 (MediaPipe 30fps)
- 사용자 맞춤형 운동 프로그램 추천
- TTS 음성 가이드 및 실시간 피드백
- 운동 성과 분석 및 진도 추적

### 실시간 통신
- WebSocket 기반 실시간 채팅
- Twilio SMS 알림 시스템
- 운동 리마인더 및 동기부여 메시지

---

## 🛠️ 기술 스택

### Frontend
- **Core**: React 19.1.1 + TypeScript 5.5.0
- **Build**: Vite 7.0.6 (빠른 HMR 및 최적화 빌드)
- **자세 감지**: @mediapipe/tasks-vision 0.10.22
- **실시간**: Socket.IO Client 4.8.1
- **차트**: Recharts 3.1.0
- **아이콘**: Lucide React 0.535.0

### Backend
- **Main API**: Spring Boot 3.5.5 (Java 21)
- **통신 서버**: NestJS 11.0.1 (TypeScript 5.7.3)
- **인증**: JWT + OAuth2 (Spring Security)
- **데이터베이스**: MySQL 8.0, MongoDB 7, Redis 7
- **레이트 리미팅**: Bucket4j 8.14.0 with Redis
- **추가 서비스**: Google Cloud Text-to-Speech, Firebase Admin SDK

### Infrastructure
- **컨테이너화**: Docker + Docker Compose
- **클라우드**: AWS ECS with Auto-scaling
- **로드 밸런싱**: Nginx
- **CI/CD**: GitHub Actions
- **모니터링**: AWS CloudWatch

---

## 📈 시스템 성능

| 지표 | 목표 | 현재 | 상태 |
|------|------|------|------|
| **페이지 로드** | <3초 | 2.3초 | ✅ |
| **API 응답** | <200ms | 45ms (P50) | ✅ |
| **자세 감지 정확도** | >95% | 97% | ✅ |
| **동시 사용자** | 1,000+ | 5,000 | ✅ |
| **가용성** | 99.9% | 99.95% | ✅ |

---

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 18+
- Java 21+
- Docker & Docker Compose
- MySQL 8.0, MongoDB 7, Redis 7

### 설치 방법

```bash
# 1. 저장소 클론
git clone https://github.com/yourusername/fitmate.git
cd fitmate

# 2. Docker Compose로 전체 스택 실행 (권장)
docker compose up -d --build

# 3. 애플리케이션 접속
# Frontend: http://localhost
# Backend API: http://localhost/api
# WebSocket: http://localhost/socket.io
```

### 개발 환경 설정

```bash
# Frontend 개발
cd frontend
npm install
npm run dev  # http://localhost:5173

# Backend 개발
./mvnw spring-boot:run  # http://localhost:8080

# Communication Server 개발
cd communication-server
npm install
npm run start:dev  # http://localhost:3000
```

---

---


---

## 📞 문의

- **이메일**: pjh133765@gmail.com
- **웹사이트**: [https://fitmateproject.com](https://fitmateproject.com)

---

<p align="center">
  Made with ❤️ by FitMate Team
</p>