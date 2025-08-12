# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Common Development Commands

### Frontend (React + TypeScript + Vite)
```bash
cd frontend

# Development
npm run dev                    # Start development server on port 5173
npm run dev:mobile            # Start dev server with mobile tunnel (localtunnel)

# Build & Test
npm run build                 # Build for production (outputs to frontend/dist)
npm run lint                  # Run ESLint
npm run preview               # Preview production build
```

### Backend (Spring Boot)
```bash
# Development (from root directory)
./mvnw spring-boot:run        # Start Spring Boot server on port 8080
./mvnw clean compile          # Clean and compile
./mvnw test                   # Run tests
./mvnw -DskipTests package    # Package without running tests

# Build
./mvnw clean install          # Full clean install
```

### Communication Server (NestJS)
```bash
cd communication-server

# Development
npm run start:dev             # Start in development mode with hot reload
npm run dev                   # Alias for start:dev
npm run start:prod            # Start in production mode

# Build & Test
npm run build                 # Build TypeScript to dist/
npm run test                  # Run unit tests
npm run test:e2e              # Run end-to-end tests
npm run test:cov              # Run tests with coverage
npm run lint                  # Run ESLint with fix
npm run format                # Format code with Prettier
```

### Docker & Full Stack
```bash
# Full stack with Docker Compose
docker compose up -d --build  # Start all services (recommended)
docker compose logs -f        # View all logs
docker compose down           # Stop all services

# Individual service logs
docker compose logs -f backend
docker compose logs -f communication-server
docker compose logs -f nginx
```

## 🏗️ Architecture Overview

FitMate is a **microservices architecture** with three main components:

### 1. Frontend (React + TypeScript)
- **Framework**: React 19 with TypeScript, built with Vite
- **Styling**: CSS modules with responsive design
- **State Management**: Context API for user state
- **Real-time**: Socket.IO client for WebSocket communication
- **Key Features**: Pose detection, OAuth2 login, real-time chat/notifications
- **Entry Point**: `frontend/src/main.tsx`
- **Routing**: React Router with HashRouter

### 2. Main Backend (Spring Boot)
- **Framework**: Spring Boot 3 with Java 21
- **Database**: MySQL for main data, Redis for caching/sessions
- **Authentication**: JWT + OAuth2 (Google, Kakao, Naver)
- **Key Features**: User management, exercise data, workout tracking, calendar integration
- **Entry Point**: `src/main/java/backend/fitmate/FitmateApplication.java`
- **Security**: Custom JWT filter chain with rate limiting (Bucket4j)

### 3. Communication Server (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: MongoDB for chat/notification data
- **Real-time**: Socket.IO for WebSocket connections
- **External Services**: Twilio for SMS notifications
- **Key Features**: Real-time chat, push notifications, SMS services
- **Entry Point**: `communication-server/src/main.ts`

### Service Communication
```
Frontend ←→ Nginx (Port 80)
    ├── /api/* → Spring Boot (Port 8080)
    ├── /sms/* → NestJS (Port 3000)
    └── /socket.io → NestJS WebSocket

Spring Boot ←→ MySQL + Redis
NestJS ←→ MongoDB + Redis (shared)
```

## 🔧 Key Configuration Files

### Environment & Configuration
- `src/main/resources/application*.properties` - Spring Boot configuration
- `communication-server/.env.development` - NestJS environment variables
- `frontend/src/config/api.ts` - API endpoint configuration
- `docker-compose.yml` - Multi-container orchestration
- `nginx/nginx.conf` - Reverse proxy configuration

### Database Configuration
- **MySQL**: Main user data, workout records, exercises
- **MongoDB**: Chat messages, notifications
- **Redis**: Session caching, rate limiting data

## 🔐 Authentication & Security

### OAuth2 Providers
Configured in `SecurityConfig.java`:
- **Google**: OAuth2 with JWT token generation
- **Kakao**: Korean social login
- **Naver**: Korean social login

### JWT Implementation
- **Token Provider**: `JwtTokenProvider.java`
- **Authentication Filter**: `JwtAuthenticationFilter.java`
- **Token Storage**: Redis for session management
- **Expiration**: 24 hours (configurable)

### Rate Limiting
- **Implementation**: Bucket4j with Redis backend
- **Configuration**: `RateLimitingConfig.java`
- **Annotation**: `@RateLimit` for method-level limiting

## 📱 Key Features & Components

### Frontend Component Structure
```
src/components/
├── authentication/     # OAuth2, signup, login forms
├── chat/              # Real-time chat interface
├── analytics/         # Workout stats, body data charts
├── onboarding/        # Multi-step user onboarding
├── workout/           # Exercise information, workout details
├── profile/           # User profile, body records
├── pose-detection/    # MediaPipe pose detection
└── settings/          # User preferences
```

### Backend Service Layer
```
src/main/java/backend/fitmate/
├── User/              # User entities, services, repositories
├── Exercise/          # Exercise data management
├── config/            # Security, JWT, OAuth2, rate limiting
├── controller/        # REST API endpoints
└── service/           # Business logic services
```

### Communication Server Modules
```
communication-server/src/
├── communication/     # WebSocket gateway (unified)
├── chat/             # Chat service logic
├── notifications/    # Notification management
├── sms/             # Twilio SMS integration
└── schemas/         # MongoDB document schemas
```

## 🗄️ Database Schemas

### MySQL (Spring Boot)
- **Users**: Authentication, profile data, OAuth2 accounts
- **Exercises**: Exercise library with MET values
- **WorkoutRecords**: User workout history
- **BodyRecords**: Physical measurements tracking

### MongoDB (NestJS)
- **ChatMessage**: Real-time chat messages
- **Notification**: Push notifications and alerts

### Redis (Shared)
- **Sessions**: JWT token validation cache
- **Rate Limiting**: Request throttling data
- **General Cache**: Application-level caching

## 🔄 Real-time Communication

### WebSocket Events (Socket.IO)
**Client → Server:**
- `joinChat`, `sendMessage`, `getHistory`
- `joinAsAdmin`, `getAllChatUsers`

**Server → Client:**
- `chatMessage`, `adminReply`, `userMessage`
- `newNotification`, `userJoined`, `userDisconnected`

### SMS Integration (Twilio)
- **Endpoints**: `/sms/send`, `/sms/request-otp`, `/sms/verify-otp`
- **Configuration**: Environment variables in communication-server
- **Rate Limiting**: Applied to OTP requests

## 🚀 Development Workflow

### Local Development Setup
1. **Start databases**: `docker compose up mysql mongo redis -d`
2. **Start backend**: `./mvnw spring-boot:run`
3. **Start communication server**: `cd communication-server && npm run start:dev`
4. **Start frontend**: `cd frontend && npm run dev`

### Production Deployment
1. **Build frontend**: `cd frontend && npm run build`
2. **Full stack**: `docker compose up -d --build`
3. **Access**: `http://localhost` (Nginx serves everything)

### Testing Strategy
- **Frontend**: Component testing with Vite test runner
- **Spring Boot**: JUnit tests with `@SpringBootTest`
- **NestJS**: Jest for unit/e2e tests (`npm run test:e2e`)

## 📊 Monitoring & Debugging

### Application Logs
- **Spring Boot**: Standard Spring logging to console
- **NestJS**: Structured logging with Winston
- **Frontend**: Browser console + Vite dev server logs

### Health Checks
- **Spring Boot**: Actuator endpoints (when enabled)
- **NestJS**: Custom health endpoints
- **Databases**: Connection monitoring in application logs

### Common Debugging
- **CORS Issues**: Check `SecurityConfig.java` and `communication-server/src/main.ts`
- **WebSocket Problems**: Verify Socket.IO client/server version compatibility
- **Database Connection**: Check environment variables and container networking
- **OAuth2 Redirect**: Verify redirect URIs in provider configurations