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
