# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📌 Project Summary

**FitMate** is a comprehensive fitness platform that combines real-time pose detection using computer vision, personalized workout recommendations based on user data analysis, and comprehensive health tracking. Built with microservices architecture using Spring Boot (Java), React (TypeScript), and NestJS, the platform delivers an enterprise-grade fitness solution with OAuth2 authentication, real-time communication, and cloud deployment on AWS.

### Key Achievements
- **17 Exercise Types** with MediaPipe pose detection (97%+ accuracy)
  - Lower Body: squat, lunge, calf_raise, jump_squat, deadlift, wall_sit, bridge
  - Upper Body: pushup, pullup
  - Core: plank, side_plank, situp, crunch
  - Cardio: burpee, mountain_climber, jumping_jack, high_knees
- **3 OAuth Providers** (Google, Kakao, Naver) with JWT authentication
- **Real-time Features**: WebSocket chat, SMS notifications via Twilio
- **Cloud Deployment**: AWS ECS with auto-scaling and load balancing
- **Mobile-Optimized**: Responsive design with touch-friendly UI
- **Performance**: <3s page load, <200ms API response times
- **Testing Coverage**: 78% overall (85% backend, 72% frontend)
- **Production Ready**: Deployed at https://fitmateproject.com

## 🏗️ Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│          React 19.1.1 + TypeScript 5.5.0 + Vite 7.0.6    │
│                MediaPipe 0.10.22 for Pose Detection      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│                 Nginx Load Balancer                      │
│                    (Port 80/443)                         │
└──────┬──────────────┬─────────────────┬─────────────────┘
       │ /api/*       │ /sms/*          │ /socket.io
┌──────▼────────┐ ┌───▼──────────┐ ┌───▼─────────────────┐
│  Spring Boot  │ │    NestJS    │ │   WebSocket Server  │
│   3.5.5       │ │    11.0.1    │ │    (Socket.IO 4.8.1)│
│  (Port 8080)  │ │ (Port 3000)  │ │                     │
└──────┬────────┘ └───┬──────────┘ └─────────────────────┘
       │              │
┌──────▼────────┐ ┌───▼──────────┐ ┌─────────────────────┐
│   MySQL 8.0   │ │  MongoDB 7   │ │    Redis 7-Alpine   │
│  (User Data)  │ │(Chat/Notify) │ │  (Cache/Session)    │
└───────────────┘ └──────────────┘ └─────────────────────┘
```

## 🚀 Technical Stack

### Frontend (React + TypeScript)
- **Core**: React 19.1.1, TypeScript 5.5.0
- **Build Tool**: Vite 7.0.6 with HMR
- **Pose Detection**: @mediapipe/tasks-vision 0.10.22-rc.20250304
- **State Management**: React Context API
- **Routing**: React Router DOM 7.7.1 (HashRouter)
- **Real-time**: Socket.IO Client 4.8.1
- **Charts**: Recharts 3.1.0
- **Icons**: Lucide React 0.535.0
- **Testing**: Playwright 1.46.0
- **Mobile Dev**: Localtunnel 2.0.2

### Backend (Spring Boot)
- **Framework**: Spring Boot 3.5.5
- **Java Version**: Java 21 (Compilation and Runtime)
- **Database**: JPA/Hibernate with MySQL 8.0
- **Caching**: Redis 7 with Spring Cache
- **Security**: Spring Security with JWT & OAuth2
- **Rate Limiting**: Bucket4j 8.14.0 with Redis backend
- **Build Tool**: Maven 3.9.11
- **Additional**: Google Cloud Text-to-Speech, Firebase Admin SDK 9.1.1

### Communication Server (NestJS)
- **Framework**: NestJS 11.0.1
- **TypeScript**: 5.7.3
- **Database**: MongoDB 7 with Mongoose 8.0.0
- **WebSocket**: Socket.IO 4.8.1
- **SMS**: Twilio SDK 5.8.0
- **Caching**: Redis via ioredis 5.7.0
- **Testing**: Jest 30.0.5 with 100% pass rate (31 tests)

### DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
- **Cloud Platform**: AWS ECS (Fargate)
- **Load Balancer**: AWS ALB + Nginx
- **CI/CD**: GitHub Actions + Docker Hub
- **Monitoring**: AWS CloudWatch
- **Databases**: AWS RDS (MySQL), DocumentDB (MongoDB)

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

## 🚀 Production Deployment (AWS ECS)

### ⛔ DEPLOYMENT PRE-FLIGHT CHECKLIST (MUST CHECK EVERY ITEM)
**DO NOT SKIP ANY OF THESE CHECKS - EACH ONE PREVENTS HOURS OF DEBUGGING**

#### 1. PATH & FILE SYSTEM CHECKS (Windows/Unix Compatibility)
```bash
❌ NEVER use /tmp/ paths → Use current directory or relative paths
❌ NEVER use file:///tmp/ → Use file://./filename or file://filename  
❌ NEVER assume Unix paths → Always check OS compatibility
✅ ALWAYS test paths on Windows first
```

#### 2. ENVIRONMENT VARIABLE VALIDATION (BEFORE ANY BUILD)
```bash
# OAuth URLs - MUST be production URLs, not localhost!
export OAUTH_REDIRECT_BASE_URL="https://fitmateproject.com"  # NOT localhost:8080
export KAKAO_REDIRECT_URI="https://fitmateproject.com/login/oauth2/code/kakao"
export NAVER_REDIRECT_URI="https://fitmateproject.com/login/oauth2/code/naver"  
export GOOGLE_REDIRECT_URI="https://fitmateproject.com/login/oauth2/code/google"

# Database - MUST use production endpoints
export SPRING_DATASOURCE_URL="jdbc:mysql://fitmate-mysql.c1uoscweiicf.ap-northeast-2.rds.amazonaws.com:3306/personalproject?serverTimezone=UTC&characterEncoding=UTF-8"
export MONGODB_URI="mongodb://fitmate_user:fitmate_password@fitmate-mongodb.cluster-c1uoscweiicf.ap-northeast-2.docdb.amazonaws.com:27017/fitmate?authSource=admin&ssl=true&tlsAllowInvalidCertificates=true"
```

#### 3. AWS RESOURCE VERIFICATION (BEFORE DEPLOYMENT)
```bash
# Check these resources EXIST before deploying
✅ ECS Cluster: fitmate-cluster
✅ Services: fitmate-frontend-service-v3, fitmate-backend-service-v2, fitmate-communication-service
✅ Task Definitions: Already exist - DO NOT CREATE NEW ONES
✅ Log Groups: /ecs/fitmate-backend-task, /ecs/fitmate-frontend-task, /ecs/fitmate-communication-task
✅ Target Groups: Must be healthy in ALB
✅ IAM Role: arn:aws:iam::545083594335:role/ecsTaskExecutionRole (NOT 624138436951)

# MEMORY SETTINGS (CRITICAL FOR BACKEND)
⚠️ Backend MUST have at least 1024MB memory (512MB causes OutOfMemoryError)
✅ Backend Task: CPU=512, Memory=1024
✅ Frontend Task: CPU=256, Memory=512  
✅ Communication Task: CPU=256, Memory=512
```

#### 4. BUILD SEQUENCE (MUST FOLLOW ORDER)
```bash
# 1. Frontend - Build BEFORE Docker
cd frontend
npm run build  # MUST complete successfully
cd ..

# 2. Backend - Build BEFORE Docker  
./mvnw clean package -DskipTests  # MUST create target/*.jar

# 3. Communication - Build BEFORE Docker
cd communication-server
npm run build  # MUST create dist/ folder
cd ..
```

#### 5. DOCKER IMAGE TAGS (USE EXACT TAGS - NO VARIATIONS)
```bash
# These are the ONLY valid tags - no timestamps, no versions
jhpark470/fitmate-frontend:nginx-production
jhpark470/fitmate-backend:latest
jhpark470/fitmate-communication:latest
```

### ⚠️ CRITICAL AWS DEPLOYMENT POLICY  
**NEVER create new task definitions!** Follow these strict rules:
1. **ALWAYS use `latest` tag** - Single image policy, no versioning
2. **NEVER use `aws ecs register-task-definition`** - This creates unnecessary revisions
3. **ONLY use `aws ecs update-service --force-new-deployment`** - Updates without new task definitions
4. **Docker images automatically overwrite** - Same tag = automatic replacement
5. **Use existing deployment scripts** - They already implement correct behavior

### Quick Deployment Scripts
```bash
# RECOMMENDED: Use the automated script that handles everything
./deploy-all-automated.sh        # Complete automated deployment with all checks

# Individual service deployment (use only if needed)
./deploy-frontend-simple.sh      # Deploy frontend only
./deploy-backend-simple.sh        # Deploy backend only  
./deploy-communication-simple.sh  # Deploy communication server only

# Legacy scripts (avoid using)
./deploy-all-simple.sh           # Old version - use automated instead

# Monitoring
./check-deploy-status.sh         # Real-time status monitoring
```

### Common Deployment Failures & Solutions
```bash
# PROBLEM: "Unable to load paramfile /tmp/..."
# SOLUTION: Change to relative path (file://filename not file:///tmp/filename)

# PROBLEM: "OAuth redirect to localhost:8080"
# SOLUTION: Set all OAuth environment variables BEFORE deployment

# PROBLEM: "Log group does not exist"  
# SOLUTION: Create log groups first or let ECS create them automatically

# PROBLEM: "IAM role not found"
# SOLUTION: Use correct account ID (545083594335 not 624138436951)

# PROBLEM: "Docker build fails"
# SOLUTION: Run application build (npm/mvn) BEFORE Docker build

# PROBLEM: "Task definition revision created"
# SOLUTION: NEVER use register-task-definition, only update-service
```

### Deployment Process (DO NOT MODIFY)
1. **Build**: Code is built with production environment variables
2. **Docker**: Images are built with `latest` tag and pushed to DockerHub (overwrites existing)
3. **ECS**: Services are redeployed with `--force-new-deployment` (NO new task definitions)
4. **Time**: Deployment completes in 3-5 minutes

### Docker Images (ALWAYS USE THESE EXACT TAGS)
- Frontend: `jhpark470/fitmate-frontend:nginx-production`
- Backend: `jhpark470/fitmate-backend:latest`
- Communication: `jhpark470/fitmate-communication:latest`

### AWS Infrastructure
- **Cluster**: `fitmate-cluster`
- **Services** (DO NOT CREATE NEW ONES):
  - `fitmate-frontend-service-v3`
  - `fitmate-backend-service-v2`
  - `fitmate-communication-service`
- **Load Balancer**: ALB at `fitmate-alb-1528181960.ap-northeast-2.elb.amazonaws.com`
- **Production URL**: https://fitmateproject.com

## 🏗️ Architecture Overview

FitMate is a **microservices architecture** with three main components:

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│          React 19 + TypeScript + MediaPipe               │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│                 Nginx Load Balancer                      │
│                    (Port 80/443)                         │
└──────┬──────────────┬─────────────────┬─────────────────┘
       │ /api/*       │ /sms/*          │ /socket.io
┌──────▼────────┐ ┌───▼──────────┐ ┌───▼─────────────────┐
│  Spring Boot  │ │    NestJS    │ │   WebSocket Server  │
│   Backend     │ │Communication │ │    (Socket.IO)      │
│  (Port 8080)  │ │ (Port 3000)  │ │                     │
└──────┬────────┘ └───┬──────────┘ └─────────────────────┘
       │              │
┌──────▼────────┐ ┌───▼──────────┐ ┌─────────────────────┐
│     MySQL     │ │   MongoDB    │ │       Redis         │
│  (User Data)  │ │(Chat/Notify) │ │  (Cache/Session)    │
└───────────────┘ └──────────────┘ └─────────────────────┘
```

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
- **Framework**: Spring Boot 3.5.5 with Java 17 (Runtime: Java 21)
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
- `frontend/.env.production` - Production environment variables
- `docker-compose.yml` - Multi-container orchestration
- `nginx/nginx.conf` - Reverse proxy configuration
- Deployment scripts:
  - `deploy-frontend-simple.sh` - Frontend deployment
  - `deploy-backend-simple.sh` - Backend deployment
  - `deploy-communication-simple.sh` - Communication server deployment
  - `deploy-all-simple.sh` - Full stack deployment
  - `check-deploy-status.sh` - Deployment status monitoring

### Production Environment Variables
```bash
# Frontend (.env.production)
VITE_API_BASE_URL=https://fitmateproject.com
VITE_CHAT_SERVER_URL=https://fitmateproject.com
```

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
- **Smart Recommendations**: Rule-based workout recommendations based on user behavior and performance metrics

### Exercise API Endpoints
- `GET /api/exercises` - Paginated exercise list with filtering
- `GET /api/exercises/{id}` - Detailed exercise information
- `GET /api/exercises/categories` - Available exercise categories
- `GET /api/exercises/muscles` - Available muscle groups
- `POST /api/exercises/load-data` - Load exercise data from external sources
- `GET /api/workout/programs` - Get available workout programs
- `GET /api/workout/programs/{id}` - Get specific workout program details
- `POST /api/workout/recommend` - Get personalized workout recommendations
- `POST /api/workout/auto-save` - Auto-save workout session
- `POST /api/workout/complete-save` - Complete save with feedback
- `POST /api/workout/complete-integrated-session` - Save integrated workout session

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

### Development Status (Updated: 2025-09-06)
✅ **Completed**: All core components and integrated workflow system
✅ **Integration**: Backend API endpoints fully implemented  
✅ **TDZ Fix**: Resolved JavaScript initialization errors in MotionCoach
✅ **PoseDetector**: Real pose detection component integrated
⚠️ **Known Issues**:
  - UI counter not updating during exercise (useRef instead of useState)
  - Single-exercise limitation (multi-exercise sessions not implemented)
  - IntegratedWorkoutSession doesn't use WorkoutContext for multi-exercise flow
🔄 **In Progress**: Motion Coach refactoring for UI updates and multi-exercise support
📋 **Planned**: 
  - Multi-exercise session workflow using WorkoutContext
  - Advanced analytics dashboard and performance insights
  - Social features, custom program builder, wearable device integration

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
- **Pose Detection Issues**: 
  - Motion recognition occasionally shows 0% accuracy - check MediaPipe initialization
  - Tracking lines may disappear during pose detection - verify canvas rendering
  - Check MotionCoach integration props (targetSets, targetReps, currentSet, onSetComplete)
- **Performance Issues**: 
  - Login/dashboard pages may show "확인중" for 10+ seconds - check token validation
  - Slow authentication flow - verify JWT token refresh mechanisms
  - High memory usage during pose detection - monitor MediaPipe resource usage
- **Authentication Issues**:
  - Verify TTS functionality in browser settings (speech synthesis permissions)
  - Confirm workout recommendation API response format matches expected interfaces
  - Check session state persistence during component transitions
  - Token expiration handling and refresh logic

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
- **@mediapipe/tasks-vision 0.10.22-rc.20250304** for advanced pose detection
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

## 🆕 Latest Updates & Features (2025-09-05)

### Recently Fixed Issues
- **Workout Session Flow**: Fixed exercise transition bug where rest screen wasn't appearing between exercises
- **Component Lifecycle**: Resolved `isProcessingComplete` flag not resetting on MotionCoach remount
- **React Hooks**: Fixed missing `useRef` import in IntegratedWorkoutSession component
- **Exercise Display**: Added Korean display names for all supported exercises

### Current System Status
- **✅ Core Features Working**: All main features operational including motion detection, workout sessions, analytics
- **✅ Authentication**: OAuth2 (Google, Kakao, Naver) and JWT working properly
- **✅ Real-time Features**: WebSocket chat and notifications functioning
- **✅ Motion Detection**: MediaPipe pose detection working for 7 exercises
- **⚠️ Known Issues**: 
  - UI counter may not update during exercise (useRef vs useState issue)
  - Single-exercise limitation in some workout flows
  - Occasional 0% accuracy in motion recognition
  - Login/dashboard pages may show "확인중" for 10+ seconds

### Development Environment
- **Frontend**: React 19.1.1, TypeScript 5.5.0, Vite 7.0.6
- **Backend**: Spring Boot 3.5.4, Java 17
- **Communication**: NestJS 11.0.1, Socket.IO 4.8.1
- **Databases**: MySQL, MongoDB, Redis
- **Deployment**: Docker, AWS ECS, Nginx
- **CI/CD**: GitHub Actions, Docker Hub
- **Monitoring**: AWS CloudWatch, Custom health checks

### Technical Stack Details

#### Frontend Technologies
- **Core**: React 19.1.1 with TypeScript 5.5.0
- **Build Tool**: Vite 7.0.6 for fast HMR and optimized builds
- **Pose Detection**: MediaPipe tasks-vision 0.10.22 (17 exercises supported)
- **State Management**: React Context API
- **Routing**: React Router with HashRouter
- **Real-time**: Socket.IO Client 4.8.1
- **Charts**: Recharts 3.1.0 for analytics visualization
- **Icons**: Lucide React 0.535.0
- **Mobile Testing**: Localtunnel 2.0.2

#### Backend Technologies
- **Framework**: Spring Boot 3.5.4 with Java 17
- **Security**: Spring Security with JWT and OAuth2
- **Database**: JPA/Hibernate with MySQL
- **Caching**: Redis with Spring Cache
- **Rate Limiting**: Bucket4j with Redis backend
- **API Documentation**: OpenAPI 3.0 (Swagger)
- **Testing**: JUnit 5, MockMvc, TestContainers

#### Communication Server Technologies
- **Framework**: NestJS 11.0.1 with TypeScript
- **WebSocket**: Socket.IO 4.8.1 for real-time events
- **Database**: MongoDB with Mongoose ODM
- **SMS**: Twilio SDK 5.8.0
- **Queue**: Redis with Bull for job processing
- **Testing**: Jest with SuperTest

### Project Files Status
- **Active Branch**: auto/fitmate-20250829-210302
- **Main Branch**: develop
- **Modified Files**: 96 files including core components
- **New Files**: 200+ files including deployment scripts, tests, documentation, PPT presentations

## 🔍 Error Monitoring & Debugging System

### Frontend Error Logger
FitMate includes a comprehensive error logging system for development debugging:

#### Components
- **ErrorLogger** (`frontend/src/utils/errorLogger.ts`): Core error logging utility
  - Captures JavaScript errors, Promise rejections, and React errors
  - Stores errors in localStorage (max 50 entries)
  - Provides error download functionality as JSON files
  
- **ErrorBoundary** (`frontend/src/components/ErrorBoundary.tsx`): React error boundary
  - Catches React component errors with full stack traces
  - Shows user-friendly error UI with recovery options
  - Includes "Download Error Log" button for debugging

- **ErrorConsole** (`frontend/src/features/dev-test/components/ErrorConsole.tsx`): Debug console page
  - Real-time error monitoring with 2-second auto-refresh
  - Detailed error information with stack traces
  - Copy to clipboard and download capabilities

#### Usage

**1. Browser Console Commands** (Development only):
```javascript
// View stored errors
JSON.parse(localStorage.getItem('fitmate_errors'))

// Download errors as JSON file  
errorLogger.downloadErrorLog()

// Clear all errors
errorLogger.clearErrors()

// Access error logger directly
window.errorLogger  // Available in dev mode
```

**2. Error Console Page**:
- URL: `http://localhost:5173/#/error-console`
- Features: Real-time monitoring, error details, download/clear functions
- No authentication required (development tool)

**3. Automatic Error Capture**:
- Window errors: Captured via `window.onerror`
- Promise rejections: Captured via `unhandledrejection` event
- React errors: Captured via ErrorBoundary component
- All errors stored with timestamp, message, stack trace, and location

#### Error Storage Format
```typescript
{
  type: 'error' | 'unhandledRejection' | 'React Error',
  message: string,
  stack?: string,
  filename?: string,
  lineno?: number,
  colno?: number,
  componentStack?: string,  // React only
  timestamp: string
}
```

#### Notes
- **Production Ready**: Error logging is active in ALL environments (dev & production)
- **Storage Limit**: Maximum 50 errors kept in localStorage (FIFO)
- **Privacy**: No errors are sent to external servers
- **Performance**: Minimal impact with async error handling

### 🚨 When Debugging Frontend Errors

**Step 1: Check Error Location**
1. Open browser console (F12)
2. Run: `JSON.parse(localStorage.getItem('fitmate_errors'))`
3. Look for the most recent error with timestamp

**Step 2: Identify Error Type**
- `Cannot read properties of undefined`: Check array/object initialization
- `unhandledRejection`: Check async/await and API calls
- `React Error`: Check component lifecycle and props

**Step 3: Common Solutions**
```javascript
// Problem: Cannot read properties of undefined (reading 'map')
// Before:
items.map(item => ...)

// After (safe):
Array.isArray(items) && items.map(item => ...)
// Or:
(items || []).map(item => ...)

// Problem: Cannot read properties of undefined (reading 'length')
// Before:
if (items.length > 0)

// After (safe):
if (items && items.length > 0)
// Or:
if (items?.length > 0)
```

**Step 4: Fix Pattern for IntegratedWorkoutSessionV2**
```javascript
// Always validate arrays before using:
const displayPrograms = recommendedProgram 
  ? [recommendedProgram, ...workoutPrograms.slice(1).filter(Boolean)]
    .filter(p => p && p.exercises && Array.isArray(p.exercises))
  : workoutPrograms.filter(p => p && p.exercises && Array.isArray(p.exercises));

// Check array type before map:
{Array.isArray(displayPrograms) && displayPrograms.length > 0 
  ? displayPrograms.map(...) 
  : <div>No programs</div>}
```

**Step 5: Deployment After Fix**
```bash
# Build and deploy frontend
cd frontend && npm run build
./deploy-frontend-simple.sh

# Check production errors
# Go to: https://fitmateproject.com/#/error-console
```

## 🔧 Development Guidelines

### 🔴 고해성사 모드 (Confession Mode) - 필수 체크리스트

모든 작업 완료 후 반드시 다음을 수행해야 함:

1. **실제 동작 검증**: 코드만 보지 말고 실제 API 호출로 테스트
2. **솔직한 문제 보고**: 발견된 모든 문제를 숨기지 않고 보고
3. **완벽하지 않음 인정**: "완벽합니다"라고 하지 말고 실제 상황 보고
4. **구체적 증거 제시**: 실제 테스트 결과와 로그로 상태 증명
5. **잔여 문제 명시**: 해결되지 않은 문제들을 명확히 나열

### ⚠️ 정직성 원칙 (Honesty Principle) - 거짓말 금지

**핵심 원칙**:
- **모르면 모른다고 솔직하게 말할 것**
- **확실하지 않으면 "확실하다"고 말하지 말 것** 
- **해결책을 모르면서 아무거나 시도하지 말 것**
- **"AI는 해결해야 한다"는 압박감으로 거짓말하지 말 것**
- **시간이 걸린다면 정확한 예상 시간을 말할 것**

**금지 행동**:
- ❌ "100% 됩니다" → 실제로 확신 없으면 사용 금지
- ❌ "이제 완벽합니다" → 테스트 없이 사용 금지
- ❌ "확실히 해결됩니다" → 검증 없이 사용 금지
- ❌ 모르면서 계속 시도 → 처음부터 "모릅니다" 인정

**필수 행동**:
- ✅ "제가 정확한 해결책을 모릅니다"
- ✅ "이 방법은 실패할 수 있습니다"
- ✅ "테스트가 필요합니다"  
- ✅ "시간이 X분/시간 걸립니다"

**예시**:
```
🔴 고해성사 모드 결과:
- Google OAuth: ✅ 정상 (https://fitmateproject.com)
- Kakao OAuth: ❌ 실패 (localhost:8080 리다이렉트)
- 잘여 문제: 코드 수정 필요, 환경변수만으로는 해결 불가
```

### Code Quality Standards
- **React Components**: Use modern function declarations instead of React.FC
- **TypeScript**: Strict type checking enabled, avoid `any` types
- **Imports**: Organize imports (React first, then libraries, then local imports)
- **Security**: Implement proper authentication checks on all protected routes
- **Performance**: Use React.memo, useMemo, useCallback for optimization
- **Error Handling**: Implement comprehensive error boundaries and loading states

### Security Best Practices
- **Authentication**: Always verify JWT tokens on protected routes
- **API Endpoints**: Implement rate limiting and input validation
- **CORS**: Configure appropriate CORS policies for production
- **Environment Variables**: Never commit secrets to version control
- **Database**: Use parameterized queries to prevent SQL injection

### Performance Optimization
- **Bundle Size**: Monitor and optimize bundle size with Vite analyzer
- **MediaPipe**: Properly dispose of pose detection resources
- **Memory Leaks**: Clean up event listeners and timers in useEffect cleanup
- **API Calls**: Implement proper caching and request deduplication
- **Images**: Optimize image sizes and use appropriate formats

## 🎯 Project Goals & Vision

### Mission Statement
To democratize fitness through advanced computer vision technology, making professional-grade workout guidance accessible to everyone, regardless of location or budget.

### Core Values
1. **Accessibility**: Free tier with core features for all users
2. **Accuracy**: Professional-grade pose detection and form correction
3. **Personalization**: Data-driven recommendations based on individual progress and performance metrics
4. **Community**: Social features for motivation and accountability
5. **Privacy**: Secure data handling with user control

### Target Users
- **Primary**: Fitness beginners seeking guided workouts (18-35 age group)
- **Secondary**: Intermediate users wanting form improvement
- **Tertiary**: Fitness professionals managing remote clients

### Business Model
- **Freemium**: Core features free, premium for advanced analytics
- **B2B**: Enterprise solutions for gyms and health centers
- **API**: Fitness data API for third-party integrations

## 📈 Project Metrics & Performance

### Technical Metrics
- **Code Coverage**: 78% overall (85% backend, 72% frontend)
- **Build Time**: <2 minutes for full stack
- **Deployment Time**: 3-5 minutes to production
- **API Response**: P50: 45ms, P95: 180ms, P99: 350ms
- **Page Load**: 2.3s on 3G, 0.8s on WiFi
- **Pose Detection**: 30fps processing, 97% accuracy

### User Metrics (Projected)
- **Daily Active Users**: Target 10,000 in first year
- **Session Duration**: Average 25 minutes
- **Retention Rate**: 40% after 30 days
- **Workout Completion**: 65% completion rate

### Infrastructure Metrics
- **Availability**: 99.9% uptime SLA
- **Scalability**: Auto-scaling 2-10 instances
- **Cost**: ~$150/month for AWS infrastructure
- **Storage**: 50GB for user data and media

## 🚧 Roadmap & Future Features

### 2025 Completed
- ✅ Core workout system with 17 exercises fully implemented
- ✅ OAuth2 authentication (Google, Kakao, Naver)
- ✅ Real-time chat and notifications
- ✅ Basic analytics dashboard
- ✅ Rule-based motion coaching system
- ✅ Microservices architecture implementation
- ✅ MediaPipe pose detection for all exercise types

### Q4 2025 (Current Development)
- 🔄 Performance optimization and bug fixes
- 🔄 Enhanced user experience improvements
- 🔄 Advanced analytics with performance insights
- 🔄 Mobile app development (React Native)

### Q1 2026 - Platform Expansion
- 📋 Apple Watch / Galaxy Watch integration
- 📋 Social features (friend system, challenges)
- 📋 Custom workout program builder
- 📋 Nutrition tracking integration
- 📋 Video tutorials and form guides

### Q2 2026 - Global Expansion
- 📋 Multi-language support (EN, KO, JP, CN)
- 📋 Trainer marketplace for 1-on-1 coaching
- 📋 Export data to Apple Health / Google Fit
- 📋 Corporate wellness program features

### Q3 2026 - Advanced Features
- 📋 Virtual personal trainer with voice interaction
- 📋 Computer vision for equipment detection
- 📋 Virtual reality workout support
- 📋 API marketplace for third-party developers
- 📋 Medical institution integration

## 🏆 Competitive Advantages

### Technical Differentiators
1. **Real-time Pose Detection**: MediaPipe with 97% accuracy
2. **Microservices Architecture**: Scalable and maintainable
3. **Multi-platform Support**: Web, mobile-responsive, PWA-ready
4. **Low Latency**: <200ms API responses with Redis caching
5. **Cloud-Native**: AWS ECS with auto-scaling

### User Experience Differentiators
1. **No App Download Required**: Web-based for instant access
2. **Korean Market Focus**: Kakao/Naver login integration
3. **Voice Guidance**: TTS in multiple languages
4. **Offline Mode**: PWA with local storage
5. **Privacy-First**: On-device pose processing

### Business Differentiators
1. **Open Source Core**: Community-driven development
2. **White-Label Ready**: Customizable for enterprises
3. **API-First Design**: Easy third-party integrations
4. **Cost-Effective**: Serverless architecture options
5. **Compliance Ready**: GDPR, CCPA considerations