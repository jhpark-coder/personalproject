# FitMate Project Overview for Gemini CLI

This `GEMINI.md` file provides a comprehensive overview of the FitMate project, designed to serve as instructional context for future interactions with the Gemini CLI.

## 1. Project Overview

FitMate is an AI-based personalized exercise platform that leverages AI technology to provide optimal exercise programs tailored to users' physical information, exercise experience, and goals. It aims to foster consistent exercise habits through real-time notifications and social features.

### Architecture

The project follows a microservices-like architecture with three main components:
*   **Frontend (React):** User interface.
*   **Backend (Spring Boot):** Main backend for business logic, authentication, and data management.
*   **Communication Server (NestJS):** Handles real-time communication (chat, notifications) and SMS services.

These components interact with various databases and external services:
*   **Databases:** MongoDB (chat, notifications, exercise data), MySQL/PostgreSQL (user, exercise records), Redis (session, cache).
*   **External Services:** Twilio (SMS notifications).

## 2. Building and Running

The project utilizes Docker and Docker Compose for containerization and multi-container management, enabling a streamlined setup and execution process.

### Setup and Dependency Installation

1.  **Environment Variables:**
    *   Create `.env.development` (or similar) files in `communication-server/` by copying `.env.example`.
    *   Configure Twilio credentials, Redis, MongoDB, and proxy targets.

2.  **Install Dependencies:**
    ```bash
    # Frontend
    cd frontend
    npm install

    # Backend (Spring Boot)
    cd ..
    ./mvnw install

    # Communication Server (NestJS)
    cd communication-server
    npm install
    ```

### Building Frontend for Nginx

```bash
cd frontend
npm run build
```

### Running the Entire Stack with Docker

```bash
cd ..
docker compose up -d --build
```
*   **Access:** `http://localhost`
*   The frontend is served as static files from `frontend/dist` by the Nginx container.
*   Requests to `/sms/*` are proxied by Nginx to the Communication Server (`communication-server:3000`).

## 3. Development Conventions

*   **Technology Stack:** The project uses modern technologies like React 18, TypeScript, Spring Boot 3, NestJS, Socket.IO, and Docker, implying a focus on robust, scalable, and maintainable code.
*   **Security:** Emphasizes JWT for token-based authentication, OAuth2 for social logins, CORS configuration for allowed domains, and rate limiting for sensitive APIs.
*   **Environment Variables:** Sensitive information (Twilio credentials, DB passwords) must be managed via `.env` files and *not* committed to Git. Wildcard CORS (`*`) should be avoided in production.
*   **Code Quality:** Implied through the use of TypeScript and frameworks like Spring Boot and NestJS, which promote structured and testable code.

## 4. Key Components/Modules

*   **Frontend (`frontend/`):** Developed with React and TypeScript, responsible for the user interface, pose detection, and real-time communication via Socket.IO Client.
*   **Backend (`src/main/java/backend/`):** A Spring Boot application handling core business logic, user management, AI exercise recommendations, and integration with various databases.
*   **Communication Server (`communication-server/`):** A NestJS application managing real-time chat, notifications (via Socket.IO and Twilio SMS), and scheduling.
*   **Nginx (`nginx/`):** Acts as a reverse proxy, serving frontend static files and routing specific API requests to the communication server.
*   **Speech Synthesis Test (`frontend/src/components/SpeechSynthesisTest.tsx`):** A component for testing the Web Speech API to develop real-time voice guidance features.

## 5. Databases and Services

*   **MongoDB:** Used for chat, notification, and exercise data.
*   **MySQL/PostgreSQL:** Used for user and exercise record data (implied by Spring Data JPA usage).
*   **Redis:** Utilized for session caching.
*   **Twilio:** Integrated for SMS notification services.

## 6. API Endpoints (Communication Server Examples)

### SMS API
*   `POST /sms/send`
*   `POST /sms/workout-recommendation`
*   `POST /sms/custom`
*   `POST /sms/health`
*   `POST /sms/request-otp`
*   `POST /sms/verify-otp`

### Notification API
*   `POST /api/notifications/create`
*   `GET /api/notifications/user/:userId`
*   `PUT /api/notifications/:id/read`
*   `GET /api/notifications/user/:userId/unread-count`

## 7. Recent Changes/Improvements (as of 2025-08-13)

*   **Data Loader Timezone Fix:** Corrected a bug in `DataLoader.java` where workout records for the current day were omitted. The logic now explicitly uses the "Asia/Seoul" timezone to prevent issues related to server time.
*   **Voice Guidance Feature Added:** Implemented a new test page (`SpeechSynthesisTest.tsx`) for the Web Speech API. Added a navigation button on the `MotionCoach.tsx` page and configured routing in `App.tsx` to access it.
*   **CORS Improvement:** `communication-server/src/main.ts` now reflects request origin when `*` is in allowed origins for development.
*   **Nginx Proxy Addition:** `nginx/nginx.conf` proxies `location /sms/` to `communication-server:3000` for frontend access.
*   **Frontend Communication Server URL Fallback:** `frontend/src/config/api.ts` defaults `CHAT_SERVER_URL` to `http://localhost:3000` if not set.
*   **Twilio OTP Request Stability:** `frontend/src/components/SignupForm.tsx` includes robust error handling for OTP requests.

## 8. Future Development Plans

The project has clear short-term, mid-term, and long-term plans, including user database integration, real exercise data-based notifications, mobile app development, advanced analytics, and machine learning-based personalization.