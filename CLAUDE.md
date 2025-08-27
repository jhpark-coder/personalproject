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
├── workout/           # Exercise information, workout details, automated workout system
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

## 🤖 Automated Workout System

### System Overview
The **Automated Workout System** provides a comprehensive, guided workout experience from program selection through completion analysis. The system integrates pose detection, TTS feedback, and real-time coaching for a seamless user experience.

### Core Components

#### 1. WorkoutProgramSelector (`WorkoutProgramSelector.tsx`)
- **Purpose**: Onboarding-style workout program selection interface
- **Modes**: Both modal and full-page implementations
- **Features**: 
  - Dynamic recommendation loading from API (`/api/workout/recommend`)
  - 4 pre-built programs: Recommended, Upper Body, Cardio, Lower Body
  - Real-time difficulty adaptation based on user experience
  - Exercise preview with set/rep information
- **Integration**: Seamless styling consistency with existing onboarding system
- **Usage**: Can be used as modal overlay or standalone page

#### 2. IntegratedWorkoutSession (`IntegratedWorkoutSession.tsx`)
- **Purpose**: Main controller for the complete automated workout experience
- **State Management**: Comprehensive session state machine with 6 phases:
  - `program_selection`: Initial program selection
  - `warmup`: Pre-workout preparation with countdown
  - `exercise_active`: Active exercise with motion detection
  - `exercise_rest`: Rest periods between sets/exercises
  - `session_complete`: Completion celebration
  - `summary`: Detailed results analysis
- **Features**:
  - Real-time progress tracking and session timing
  - TTS (Text-to-Speech) voice guidance throughout workout
  - Automatic progression through exercises and sets
  - Integration with MotionCoach for pose detection
  - Session data collection for analysis
- **API Integration**: 
  - POST `/api/workout/complete-integrated-session` for session saving
  - Real-time notifications via WebSocket

#### 3. RestTimer (`RestTimer.tsx`)
- **Purpose**: Interactive rest period component with visual countdown
- **Features**:
  - Circular progress indicator with customizable duration
  - Play/pause controls for rest management
  - Skip functionality for advanced users
  - Motivational messaging during rest periods
- **Design**: Full-screen overlay with engaging animations
- **Accessibility**: Large touch targets and clear time display

#### 4. WorkoutSessionSummary (`WorkoutSessionSummary.tsx`)
- **Purpose**: Comprehensive post-workout analysis and results display
- **Analytics Features**:
  - Performance grading system (S/A/B/C/D grades)
  - Completion rate and accuracy metrics
  - Exercise-by-exercise breakdown with individual scores
  - Personalized improvement suggestions
  - Session statistics (time, calories, sets completed)
- **Actions**:
  - Save workout session to database
  - Navigate to dashboard or start new workout
  - Social sharing capabilities (planned)

### Workflow Documentation
- **Implementation Guide**: `AUTOMATED_WORKOUT_WORKFLOW.md`
- **Technical Roadmap**: 5-phase development plan with API specifications
- **Architecture Diagrams**: Data flow and component interaction maps

### API Endpoints

#### Workout Recommendation System
```bash
POST /api/workout/recommend
# Request: User profile data (goal, experience, weight, height, age)
# Response: Personalized workout program with exercises and parameters
```

#### Session Management
```bash
POST /api/workout/complete-integrated-session
# Request: Complete session data with exercise results and performance metrics
# Response: Saved session ID and updated user progress
```

### Routing Structure
```bash
/workout/selector          # Program selection (standalone page)
/workout/integrated        # Complete automated workout session
```

### Exercise Type System
```typescript
type ExerciseType = 'squat' | 'lunge' | 'pushup' | 'plank' | 
                   'calf_raise' | 'burpee' | 'mountain_climber';

interface WorkoutExercise {
  exerciseType: ExerciseType;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  estimatedDuration: number;
}

interface WorkoutProgram {
  id: 'recommended' | 'upper_body' | 'cardio' | 'lower_body';
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  estimatedCalories: number;
  exercises: WorkoutExercise[];
}
```

### Integration Points

#### With Existing Systems
- **MotionCoach**: Pose detection and real-time feedback during exercises
- **Dashboard**: Session history and progress tracking integration
- **Calendar**: Workout scheduling and completion tracking
- **Notifications**: Real-time updates and achievement alerts
- **Analytics**: Performance metrics and long-term trend analysis

#### TTS Integration
- Voice guidance for exercise transitions
- Form correction prompts
- Motivational feedback during workouts
- Rest period countdown announcements

### Mobile Optimization
- **Responsive Design**: Optimized layouts for all screen sizes
- **Touch Interactions**: Large, accessible touch targets for workout controls
- **Performance**: Efficient rendering during active exercise sessions
- **Battery Optimization**: Minimal background processing during workouts

### Development Status
✅ **Completed**: All core components and basic workflow
🔄 **Integration**: Backend API endpoints implementation needed
📋 **Future**: Advanced analytics, social features, custom program builder

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

### Testing Automated Workout System
1. **Access Program Selection**: Navigate to `http://localhost:5173/#/workout/selector`
2. **Test Integrated Workflow**: Navigate to `http://localhost:5173/#/workout/integrated`
3. **Required Backend Endpoints**: 
   - `POST /api/workout/recommend` - For personalized recommendations
   - `POST /api/workout/complete-integrated-session` - For session saving

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
- **Automated Workout Issues**: 
  - Check MotionCoach integration props (targetSets, targetReps, currentSet, onSetComplete)
  - Verify TTS functionality in browser settings (speech synthesis permissions)
  - Confirm workout recommendation API response format matches expected interfaces
  - Check session state persistence during component transitions

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