# Project Analysis: FitMate

This report provides a comprehensive overview and analysis of the FitMate project, based on its current file structure and configuration.

## 1. Project Overview

FitMate appears to be a full-stack application designed for health and fitness management. It follows a microservices-like architecture, comprising a Java Spring Boot backend, a React-based frontend, and a NestJS communication server, all orchestrated using Docker. The project integrates various technologies for real-time communication, data storage, and external service interactions.

## 2. Backend (Java/Spring Boot)

The backend is built with **Spring Boot (version 3.5.4)** and uses **Java 21**. It handles core business logic, data persistence, and integrations with external services.

### Key Technologies & Dependencies:
*   **Spring Boot Starters**: `data-jpa` (for database interaction), `data-redis` (for Redis integration), `mail` (for email services), `oauth2-client` (for OAuth2 authentication), `security` (for security features), `web` (for REST APIs), `quartz` (for scheduling).
*   **Database**: Uses `mysql-connector-j` and `mariadb-java-client`, indicating support for MySQL/MariaDB.
*   **Security**: `spring-boot-starter-security` for authentication/authorization, `jjwt-api`, `jjwt-impl`, `jjwt-jackson` for JWT handling.
*   **External Integrations**:
    *   **Google Calendar API**: `google-api-services-calendar`, `google-api-client`, `google-oauth-client-jetty`, `google-auth-library-oauth2-http`, `google-auth-library-credentials`.
    *   **Firebase Admin SDK**: `firebase-admin` for Firebase services (likely push notifications).
    *   **HTTP Client**: `spring-boot-starter-webflux` for reactive web client (potentially for external API calls).
*   **Rate Limiting**: `Bucket4j` with Redis integration (`bucket4j_jdk17-core`, `bucket4j_jdk17-redis-common`, `bucket4j_jdk17-lettuce`) for API rate limiting.
*   **Utilities**: `Lombok` for reducing boilerplate code.

### Configuration:
*   `application.properties`, `application-dev.properties`, `application-prod.properties` for environment-specific configurations.
*   Docker environment variables in `docker-compose.yml` for database connection, Redis, OAuth redirect URIs, and JWT secret.

## 3. Frontend (React)

The frontend is a **React** application initialized with **Vite**. It provides the user interface and interacts with the backend and communication server.

### Key Technologies & Dependencies:
*   **Framework**: `react` (version 19.1.1), `react-dom` (version 19.1.1).
*   **Build Tool**: `vite` (version 7.0.6).
*   **Routing**: `react-router-dom` (version 7.7.1).
*   **Real-time Communication**: `socket.io-client` (version 4.8.1) for connecting to the communication server.
*   **Data Visualization**: `recharts` (version 3.1.0).
*   **Pose Detection**: `@mediapipe/pose` (version 0.5.1675469404) for motion coaching features.
*   **Firebase**: `firebase` (version 12.0.0) for client-side Firebase interactions (e.g., authentication, analytics, messaging).
*   **Icons**: `lucide-react` (version 0.535.0).

### Structure:
*   `src/App.tsx`, `src/main.tsx` are entry points.
*   `src/components/` contains various UI components, including `ChatButton`, `ChatDashboard`, `ChatPage`, `ChatRoom`, `NotificationCenter`, `MotionCoach`, `PoseDetector`, and `analytics`, `onboarding`, `profile`, `settings`, `workout` subdirectories, indicating a rich feature set.
*   `src/context/UserContext.tsx` suggests global state management for user data.
*   `src/config/api.ts` for API configurations.
*   `src/utils/calorieCalculator.ts` for utility functions.

## 4. Communication Server (NestJS)

The communication server is a **NestJS** application, primarily responsible for real-time chat and notification services.

### Key Technologies & Dependencies:
*   **Framework**: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`.
*   **WebSockets**: `@nestjs/platform-socket.io`, `@nestjs/websockets` (version 11.1.3) for real-time communication.
*   **Database**: `@nestjs/mongoose` (version 11.0.0) for MongoDB interaction.
*   **Redis**: `ioredis` (version 5.7.0) for Redis integration (likely for pub/sub or caching).
*   **Scheduling**: `@nestjs/schedule` (version 6.0.0) for scheduled tasks (e.g., notifications).
*   **SMS**: `twilio` (version 5.8.0) for SMS notifications.
*   **Configuration**: `@nestjs/config` for environment variable management.

### Structure:
*   `src/main.ts` is the entry point.
*   `src/chat/` for chat-related services and DTOs.
*   `src/communication/communication.gateway.ts` is the core WebSocket gateway.
*   `src/notifications/` for notification services, controllers, and DTOs.
*   `src/redis/` for Redis service.
*   `src/schemas/` for Mongoose schemas (`chat-message.schema.ts`, `notification.schema.ts`).
*   `src/sms/` for SMS services.

### Configuration:
*   `docker-compose.yml` environment variables for MongoDB URI, Redis host/port, and Twilio credentials.

## 5. DevOps & Infrastructure (Docker, Nginx)

The project leverages Docker for containerization and `docker-compose` for multi-container application orchestration. Nginx acts as a reverse proxy.

### Docker & Docker Compose:
*   **Services**: `nginx`, `backend`, `communication-server`, `mysql`, `mongo`, `redis`.
*   **Networking**: All services are on a custom `fitmate-network`.
*   **Databases**: Dedicated containers for MySQL (version 8.0) and MongoDB (version 7), with persistent volumes (`mysql_data`, `mongo_data`, `redis_data`).
*   **Redis**: `redis:7-alpine` image for caching and messaging.
*   **Build Contexts**: Each service has its own `Dockerfile` or uses a specific image.

### Nginx:
*   **Configuration**: `nginx/nginx.conf` defines the reverse proxy rules.
*   **Ports**: Listens on port 80.
*   **Proxy Passes**:
    *   `/api/` requests are proxied to `backend_server` (Java Spring Boot, port 8080).
    *   `/sms/` requests are proxied to `communication_server` (NestJS, port 3000).
    *   `/socket.io/` requests are proxied to `communication_server` for WebSocket communication.
    *   Root (`/`) serves the static frontend files.

## 6. Data

The project includes several CSV files at the root level:
*   `한국건강증진개발원_보건소 모바일 헬스케어 운동_20240919.csv`
*   `mets_data_utf8.csv`
*   `temp_utf8.csv`
These likely contain seed data or reference data used by the application, possibly for exercise information or health metrics.

## 7. Recommendations & Next Steps

Based on this initial analysis, here are some recommendations and areas for further investigation:

*   **Security Audit**: Given the use of OAuth2, JWT, and Twilio, a thorough security audit is recommended, especially for authentication flows, data handling, and API rate limiting.
*   **Performance Testing**: With real-time communication (WebSockets) and pose detection, performance testing (load testing, latency analysis) would be crucial.
*   **Error Handling & Logging**: Review error handling mechanisms across all services and ensure comprehensive logging for debugging and monitoring.
*   **Configuration Management**: Centralize and secure sensitive configurations (e.g., API keys, secrets) using a more robust solution than environment variables in `docker-compose.yml` for production environments (e.g., Docker Secrets, Kubernetes Secrets, HashiCorp Vault).
*   **Database Migrations**: Implement a robust database migration tool (e.g., Flyway or Liquibase for Spring Boot) to manage schema changes in MySQL.
*   **Frontend State Management**: Evaluate the current state management approach (UserContext) for scalability and complexity as the application grows. Consider libraries like Redux, Zustand, or Jotai if needed.
*   **Code Quality**: Implement static code analysis tools (e.g., SonarQube) and enforce coding standards across all three services.
*   **Testing Strategy**: Ensure comprehensive unit, integration, and end-to-end tests are in place for all critical functionalities.
*   **Documentation**: Enhance documentation for API endpoints, data models, and service interactions to facilitate future development and maintenance.

This analysis provides a solid foundation for understanding the FitMate project.