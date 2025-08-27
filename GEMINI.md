# FitMate Project Overview for Gemini CLI

This `GEMINI.md` file provides a comprehensive overview of the FitMate project, designed to serve as instructional context for future interactions with the Gemini CLI.

**Last Updated: 2025-08-27**

## 1. Project Overview

FitMate is an AI-based personalized exercise platform that leverages AI technology to provide optimal exercise programs tailored to users' physical information, exercise experience, and goals. It aims to foster consistent exercise habits through real-time notifications and social features.

### Architecture

The project follows a microservices-like architecture with three main components orchestrated by Docker Compose:
*   **Frontend (React + Vite):** A modern, client-side rendered user interface responsible for user interaction, pose detection via MediaPipe, and real-time communication.
*   **Backend (Spring Boot):** The core backend service handling main business logic, user management, authentication/authorization (JWT, OAuth2), AI exercise recommendations, and data persistence.
*   **Communication Server (NestJS):** A dedicated server for real-time functionalities (chat, notifications via Socket.IO) and external communication services (SMS via Twilio).

These components are fronted by an **Nginx** container acting as a reverse proxy and API gateway, routing requests to the appropriate backend service.

### Data Stores
*   **MySQL:** Primary relational database for core user data, exercise records, etc.
*   **MongoDB:** Document database for semi-structured data like chat logs and notifications.
*   **Redis:** In-memory data store for session and caching, enhancing performance.

## 2. Building and Running

The project utilizes Docker and Docker Compose for a streamlined setup and execution process.

### Setup and Dependency Installation
1.  **Environment Variables:** Create `.env` files for each service based on `.env.example` files.
2.  **Install Dependencies:** Run `npm install` in `frontend/` and `communication-server/`, and `./mvnw install` in the root directory for the backend.
3.  **Run with Docker:** Execute `docker compose up -d --build` from the root directory.
    *   **Access:** `http://localhost`

---

## 3. Comprehensive Analysis Report (as of 2025-08-27)

This report provides a multi-domain analysis from the perspectives of System Architecture, Security, Performance, and Quality.

### 3.1. Executive Summary
FitMate is a well-architected application built on a robust and modern technology stack. The microservices-like pattern provides a strong foundation for scalability and separation of concerns. Key strengths include clear service boundaries, use of containerization, and adoption of modern security practices like JWT/OAuth2 and rate limiting.

Primary risks and opportunities lie in configuration management, proactive performance tuning for scalability, and deepening the testing strategy to cover inter-service interactions. Addressing these areas will ensure long-term stability and maintainability as the platform grows.

### 3.2. Architecture Assessment
*   **Strengths:**
    *   **Clear Separation of Concerns:** The division into three distinct services (Frontend, Backend, Communication) is logical and promotes independent development and deployment.
    *   **Effective Orchestration:** `docker-compose.yml` effectively defines the multi-container environment, service dependencies, and networking, simplifying the development setup.
    *   **Centralized Routing:** `nginx.conf` demonstrates a well-defined API gateway pattern, correctly routing traffic to the appropriate backend services based on URL paths. This simplifies the frontend configuration and secures the backend services.
    *   **Polyglot Persistence:** The use of MySQL, MongoDB, and Redis is well-aligned with their respective strengths, demonstrating a mature data management strategy.

*   **Risks & Recommendations:**
    *   **Single Point of Failure (SPOF):** For 10x growth, the current single-instance setup for Nginx, MySQL, MongoDB, and Redis will become a bottleneck.
        *   **Recommendation:** Plan for a high-availability (HA) architecture using load balancers (e.g., AWS ALB/NLB), database replicas (read/write splitting), and a Redis cluster.
    *   **Configuration Management:** Managing environment variables across multiple `.env` files can lead to configuration drift.
        *   **Recommendation:** Centralize configuration using a tool like HashiCorp Consul, AWS Parameter Store, or at a minimum, a shared, version-controlled configuration system.

### 3.3. Security Audit
*   **Strengths:**
    *   **Modern Authentication:** Implementation of Spring Security with JWT and OAuth2 provides a robust foundation for authentication.
    *   **Proactive Rate Limiting:** The use of `bucket4j` in the Spring Boot backend is an excellent measure to prevent abuse and mitigate certain DoS attacks.
    *   **Secret Management:** The use of `.env` files avoids hardcoding secrets in the source code, which is a critical security practice.

*   **Vulnerabilities & Recommendations:**
    *   **A05:2021 - Security Misconfiguration:** The dynamic CORS policy in the communication server needs rigorous auditing to prevent potential abuse in production environments.
        *   **Recommendation:** Implement a strict, whitelist-based CORS policy for production builds.
    *   **A01:2021 - Broken Access Control:** While authentication is solid, the analysis of authorization logic (ensuring a user can only access their own data) requires deeper code review.
        *   **Recommendation:** Systematically review all data-accessing endpoints to ensure they have robust authorization checks based on the authenticated principal.
    *   **Dependency Vulnerabilities:** The `pom.xml` and `package.json` files list numerous third-party dependencies, which are a common attack vector.
        *   **Recommendation (Critical):** Integrate automated dependency scanning tools like `npm audit`, Snyk, or Maven's `dependency-check-plugin` into the CI/CD pipeline.

### 3.4. Performance Profile
*   **Strengths:**
    *   **Efficient Frontend:** Using React with Vite ensures a fast development experience and an optimized production build.
    *   **Effective Caching:** Leveraging Redis for session and (potentially) data caching significantly reduces database load and improves response times.
    *   **Real-time Efficiency:** Using WebSockets (Socket.IO) for notifications and chat is far more efficient than traditional HTTP polling.

*   **Bottlenecks & Recommendations:**
    *   **Database Performance:** Complex queries, especially with JPA, can lead to N+1 problems or slow performance without proper indexing.
        *   **Recommendation:** Proactively analyze query performance using tools like Spring Data's query logging or a dedicated APM solution. Add indexes to MySQL and MongoDB for frequently queried fields.
    *   **WebSocket Scalability:** The single NestJS instance will be a bottleneck with a high number of concurrent WebSocket connections.
        *   **Recommendation:** Implement the Socket.IO Redis Adapter. This allows broadcasting events across multiple NestJS instances, enabling horizontal scaling.
    *   **Client-Side Performance:** Pose detection with `@mediapipe/pose` is computationally intensive and its performance is highly dependent on the user's device.
        *   **Recommendation:** Clearly document the minimum hardware requirements. Implement performance monitoring on the frontend to identify devices that struggle and potentially offer a lower-fidelity mode.

### 3.5. Quality & Maintainability
*   **Strengths:**
    *   **Strongly-Typed Codebase:** The use of TypeScript (Frontend, Comms Server) and Java (Backend) enhances code quality, reduces runtime errors, and improves developer experience.
    *   **Organized Structure:** The project follows standard conventions for each framework, with a logical feature-based organization of files.
    *   **Code Quality Tooling:** The presence of ESLint, Prettier, and testing frameworks (`jest`, `junit`) indicates a commitment to code quality.

*   **Gaps & Recommendations:**
    *   **Testing Strategy:** While unit test frameworks are present, their coverage is unknown. More importantly, integration and end-to-end (E2E) tests are crucial for a multi-service architecture.
        *   **Recommendation:** Prioritize writing integration tests for critical user flows (e.g., signup, login, creating a workout). These tests should span all three services.
    *   **API Documentation:** There is no automated API documentation generation.
        *   **Recommendation:** Integrate Swagger (OpenAPI) with the Spring Boot and NestJS backends to provide clear, interactive API documentation.

---

## 4. Prioritized Action Plan

### Critical (Act Immediately)
1.  **Run Dependency Vulnerability Scans:** Execute `npm audit --production` and a Maven dependency checker (e.g., `dependency-check-plugin`) to find and patch known vulnerabilities.
2.  **Implement Secret Scanning:** Add a pre-commit hook or a CI job (e.g., with `git-secrets` or `gitleaks`) to prevent accidental commits of sensitive information.
3.  **Review Production CORS Policy:** Ensure the production environment has a strict, non-wildcard CORS whitelist.

### High (Plan for Next Sprint)
1.  **Add Database Indexing:** Analyze common query patterns and add indexes to critical tables/collections in MySQL and MongoDB.
2.  **Implement Socket.IO Redis Adapter:** Configure the Redis adapter in the NestJS communication server to enable stateless, scalable WebSocket handling.
3.  **Expand Test Coverage:** Write integration tests for the authentication flow and core workout creation/retrieval logic.

### Medium (Consider for Roadmap)
1.  **Centralize Configuration:** Evaluate and implement a centralized configuration solution (e.g., HashiCorp Consul, AWS Parameter Store).
2.  **Generate API Documentation:** Integrate Swagger/OpenAPI into both backend services.
3.  **Develop a High-Availability Plan:** Create a technical roadmap for evolving the infrastructure to support load balancing and data replication for key services.