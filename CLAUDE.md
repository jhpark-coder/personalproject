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
- **Styling**: CSS modules with responsive design, mobile-first approach
- **State Management**: Context API for user state
- **Real-time**: Socket.IO client for WebSocket communication
- **Key Features**: Pose detection, OAuth2 login, real-time chat/notifications, calendar integration, workout analytics, mobile-optimized UI
- **Entry Point**: `frontend/src/main.tsx`
- **Routing**: React Router with HashRouter
- **Mobile Support**: Responsive design with mobile tunnel (localtunnel) for development testing

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
├── analytics/         # Workout stats, body data charts (BodyData, WorkoutStats)
├── onboarding/        # Multi-step user onboarding
├── workout/           # Exercise information with search/filter, workout details
├── profile/           # User profile, body records
├── pose-detection/    # MediaPipe pose detection
├── settings/          # User preferences
├── Calendar.tsx       # Workout calendar with data consistency
├── Dashboard.tsx      # Main dashboard with mobile optimization
├── NavigationBar.tsx  # Mobile-responsive bottom navigation
└── Modal.tsx          # Reusable modal component
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
- **Exercises**: Exercise library with MET values, categories, muscles, equipment, intensity levels
- **WorkoutRecords**: User workout history with calendar integration
- **BodyRecords**: Physical measurements tracking

### MongoDB (NestJS)
- **ChatMessage**: Real-time chat messages
- **Notification**: Push notifications and alerts

### Redis (Shared)
- **Sessions**: JWT token validation cache
- **Rate Limiting**: Request throttling data
- **General Cache**: Application-level caching

## 🏋️ Exercise Information System

### Exercise Features
- **Comprehensive Database**: Exercise library with detailed information including MET values, muscle groups, equipment
- **Advanced Search**: Multi-modal search by name, muscle group, intensity, and body part
- **Calorie Calculation**: Real-time calorie burn calculation based on user profile and exercise MET values
- **Detailed Information**: Exercise instructions, muscle targeting, equipment requirements
- **Infinite Scroll**: Paginated loading for large exercise datasets
- **Mobile Optimization**: Touch-friendly scroll controls and responsive design

### Exercise API Endpoints
- `GET /api/exercises` - Paginated exercise list with filtering
- `GET /api/exercises/{id}` - Detailed exercise information
- `GET /api/exercises/categories` - Available exercise categories
- `GET /api/exercises/muscles` - Available muscle groups
- `POST /api/exercises/load-data` - Load exercise data from external sources

### Search & Filter Capabilities
- **Name Search**: Keyword-based exercise name search
- **Muscle Targeting**: Filter by primary/secondary muscle groups
- **Body Part Categories**: Filter by exercise categories (한글 지원)
- **Intensity Levels**: Filter by LOW/MEDIUM/HIGH intensity
- **Combined Filters**: Multiple filter combinations for precise results

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
- **Mobile UI Issues**: Check CSS media queries and navigation bar padding calculations
- **Data Inconsistency**: Verify API endpoint consistency between components (use MYPAGE_DASHBOARD)
- **Scroll Issues**: Ensure proper mobile navigation bar height calculations with CSS variables

## 📱 Mobile UI & Responsive Design

### Key Mobile Features
- **Responsive Design**: Mobile-first approach with breakpoints at 768px and 480px
- **Navigation Bar**: Fixed bottom navigation with proper safe area handling
- **Scroll Optimization**: Enhanced scroll behavior for mobile devices with proper padding calculations
- **Touch Support**: Optimized touch interactions and scroll controls
- **Mobile Tunnel**: Development testing with localtunnel for real device testing

### CSS Architecture
- **CSS Variables**: Consistent spacing with `--bottom-nav-height: 56px`
- **Safe Area**: Proper handling of device safe areas with `env(safe-area-inset-bottom)`
- **Media Queries**: Progressive enhancement for different screen sizes
- **Scroll Controls**: Enhanced horizontal scroll with touch support for filter buttons

### Common Mobile Issues & Solutions
- **Navigation Overlap**: Use `calc(env(safe-area-inset-bottom) + var(--bottom-nav-height) + padding)`
- **Hover Effects**: Disabled on mobile to prevent layout shifts
- **Scroll Buttons**: Responsive sizing instead of hiding on mobile
- **Data Consistency**: Unified API endpoints between calendar and analytics components

## 📦 Dependencies & Technologies

### Frontend Dependencies
- **React 19.1.1** with **TypeScript 5.5.0**
- **Vite 7.0.6** for build tooling
- **@mediapipe/pose 0.5.1675469404** for pose detection
- **Firebase 12.0.0** for additional services
- **Socket.IO Client 4.8.1** for WebSocket communication
- **Recharts 3.1.0** for data visualization
- **Lucide React 0.535.0** for icons
- **Localtunnel 2.0.2** for mobile development testing

### Communication Server Dependencies
- **NestJS 11.0.1** framework with full ecosystem
- **MongoDB** integration via **Mongoose 8.0.0**
- **Socket.IO 4.8.1** for WebSocket server
- **Twilio 5.8.0** for SMS services
- **Redis** integration via **ioredis 5.7.0**
- **Cross-env 10.0.0** for environment management

### Key Development Features
- **Hot Reload**: Both frontend (Vite) and backend (NestJS) support hot reload
- **TypeScript**: Full TypeScript support across frontend and communication server
- **ESLint & Prettier**: Code quality and formatting tools
- **Testing**: Jest for NestJS, Vite test runner for frontend
- **Docker Integration**: Full containerization with docker-compose