<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Notification Server

독립적인 실시간 통신 서버입니다. MongoDB를 사용하여 채팅 메시지와 알림을 관리하며, WebSocket을 통해 실시간 통신을 제공합니다.

## 🚀 기능

- **실시간 채팅**: WebSocket을 통한 실시간 메시지 전송
- **알림 시스템**: 사용자별 개별 알림 및 관리자 브로드캐스트
- **MongoDB 연동**: 채팅 메시지 및 알림 데이터 영구 저장
- **Spring Boot 연동**: 기존 시스템과 HTTP API로 연동

## 📋 요구사항

- Node.js 18+
- MongoDB 6.0+
- Docker (선택사항)

## 🛠️ 설치 및 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 추가하세요:
```env
MONGODB_URI=mongodb://localhost:27017/communication-server
PORT=3000
```

### 3. 개발 서버 실행
```bash
npm run start:dev
```

### 4. Docker로 실행 (권장)
```bash
docker-compose up -d
```

## 🔌 API 엔드포인트

### 알림 관련
- `POST /api/notifications/create` - 새 알림 생성
- `GET /api/notifications/user/:userId` - 사용자 알림 목록
- `PUT /api/notifications/:id/read` - 알림 읽음 처리
- `GET /api/notifications/user/:userId/unread-count` - 읽지 않은 알림 개수
- `POST /api/notifications/admin/create` - 관리자 알림 브로드캐스트

### WebSocket 이벤트
- `joinChat` - 채팅방 입장
- `sendMessage` - 메시지 전송
- `getHistory` - 채팅 내역 조회
- `getOnlineUsers` - 온라인 사용자 목록

## 🗄️ 데이터베이스

### MongoDB 컬렉션
- `chatmessages` - 채팅 메시지
- `notifications` - 알림

### 스키마
```typescript
// ChatMessage
{
  sender: string;
  content: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE';
  recipient?: string;
  timestamp: Date;
}

// Notification
{
  senderUserId: number;
  targetUserId: number;
  message: string;
  type: string;
  category: 'SOCIAL' | 'AUCTION' | 'ORDER' | 'ADMIN';
  link?: string;
  isRead: boolean;
}
```

## 🔗 Spring Boot 연동

Spring Boot에서 알림을 전송하려면:

```java
@PostMapping("/api/notifications/create")
public ResponseEntity<String> sendNotification(@RequestBody NotificationRequest request) {
    // NestJS 통신서버로 HTTP 요청
    String nestjsUrl = "http://localhost:3000/api/notifications/create";
    // HTTP 클라이언트로 NestJS에 전송
}
```

## 🚀 확장 계획

- [ ] SMS 발송 기능
- [ ] 이메일 알림
- [ ] 푸시 알림
- [ ] 알림 템플릿 시스템
- [ ] 알림 우선순위 설정

# FitMate 통신 서버 (Communication Server)

FitMate 프로젝트의 실시간 통신을 담당하는 마이크로서비스입니다. WebSocket을 통해 채팅과 알림 기능을 제공합니다.

## 🚀 주요 기능

### 📱 실시간 채팅
- 사용자와 관리자 간 실시간 채팅
- 채팅 내역 MongoDB 저장 및 조회
- 온라인 사용자 관리
- 안읽은 메시지 카운트

### 🔔 실시간 알림
- 사용자별 개별 알림
- 관리자 그룹 알림
- 전체 브로드캐스트 알림
- 알림 읽음 처리

### 👨‍💼 관리자 대시보드
- 실시간 사용자 목록
- 채팅 내역 조회
- 사용자 상태 모니터링
- 알림 관리

## 🏗️ 아키텍처

```
┌─────────────────┐    WebSocket    ┌──────────────────┐
│   Frontend      │ ◄──────────────► │ Communication    │
│   (React)       │                 │ Server           │
└─────────────────┘                 │ (NestJS)        │
                                    └──────────────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │   MongoDB        │
                                    │   (Chat/Notify)  │
                                    └──────────────────┘
```

## 🛠️ 기술 스택

- **Backend**: NestJS, TypeScript
- **WebSocket**: Socket.IO
- **Database**: MongoDB (Mongoose)
- **Container**: Docker, Docker Compose

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
# .env 파일 생성
cp .env.example .env

# 환경 변수 설정
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/fitmate
FRONTEND_URL=http://localhost:8080
CHAT_MANAGER_URL=http://localhost:5173
```

### 3. 개발 서버 실행
```bash
# 개발 모드
npm run start:dev

# 프로덕션 모드
npm run start:prod
```

### 4. Docker로 실행
```bash
# Docker Compose로 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f communication-server
```

## 🔌 WebSocket 이벤트

### 클라이언트 → 서버
- `joinChat` - 채팅 참가
- `joinAsAdmin` - 관리자로 참가
- `sendMessage` - 메시지 전송
- `getHistory` - 채팅 내역 조회
- `getAllChatUsers` - 모든 사용자 조회
- `getUserLastMessage` - 사용자 최근 메시지 조회

### 서버 → 클라이언트
- `chatMessage` - 일반 메시지 수신
- `adminReply` - 관리자 답장 수신
- `userMessage` - 사용자 메시지 (관리자용)
- `chatHistory` - 채팅 내역 응답
- `userJoined` - 사용자 접속 알림
- `userDisconnected` - 사용자 접속 해제 알림
- `adminOnline` - 관리자 온라인 알림
- `adminOffline` - 관리자 오프라인 알림
- `newNotification` - 새 알림 수신

## 📡 API 엔드포인트

### 알림 관련
- `POST /api/notifications/create` - 알림 생성
- `POST /api/notifications/admin/create` - 관리자 알림
- `POST /api/notifications/broadcast` - 전체 브로드캐스트
- `GET /api/notifications/user/:userId` - 사용자 알림 목록
- `PUT /api/notifications/:id/read` - 알림 읽음 처리
- `GET /api/notifications/user/:userId/unread-count` - 안읽은 알림 수

## 🔧 개발 가이드

### 프로젝트 구조
```
src/
├── communication/          # 통합 게이트웨이
│   ├── communication.gateway.ts
│   └── communication.module.ts
├── chat/                  # 채팅 서비스
│   ├── chat.service.ts
│   └── dto/
├── notifications/         # 알림 서비스
│   ├── notifications.service.ts
│   ├── notifications.controller.ts
│   └── dto/
├── schemas/              # MongoDB 스키마
│   ├── chat-message.schema.ts
│   └── notification.schema.ts
└── config/               # 설정 파일
    ├── app.config.ts
    ├── development.config.ts
    └── production.config.ts
```

### 테스트
```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:cov
```

## 🐛 문제 해결

### 연결 문제
1. CORS 설정 확인
2. 포트 충돌 확인
3. MongoDB 연결 상태 확인

### 메시지 전송 실패
1. WebSocket 연결 상태 확인
2. 사용자 인증 정보 확인
3. 서버 로그 확인

## 📝 변경 이력

### v1.0.0 (2024-01-XX)
- ✅ 통합된 통신 서버 구현
- ✅ 채팅 및 알림 기능 통합
- ✅ 관리자 대시보드 통합
- ✅ Docker 컨테이너화
- ✅ 환경 설정 통합

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
