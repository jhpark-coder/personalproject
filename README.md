# FitMate

FitMate is a multi-service fitness platform composed of a React web app, a Spring Boot API, and a NestJS communication server. The repository is organized as a monorepo so each runtime boundary is explicit and infrastructure stays separate from app code.

## Repository Layout

```text
apps/
  backend/               Spring Boot API
  web/                   React + Vite client
  communication-server/  NestJS notifications/chat/SMS
infra/
  nginx/                 Reverse proxy and frontend image build
data/
  seed/                  SQL and CSV seed assets
docs/
  architecture.md        Structure and responsibility notes
```

## Runtime Topology

- `apps/web` is built into the Nginx image and served on port `80`
- `apps/backend` exposes the main REST API on port `8080`
- `apps/communication-server` exposes notification, SMS, and Socket.IO endpoints on port `3000`
- `mysql`, `mongo`, and `redis` support the three app services

Nginx keeps the external paths stable:

- `/api/*`, `/oauth2/*`, `/login/oauth2/*` -> Spring Boot
- `/api/notifications/*`, `/sms/*`, `/socket.io/*` -> communication server
- `/` -> React SPA

## Quick Start

1. Add a root `.env` file with the database, Redis, JWT, OAuth, Firebase, and Twilio secrets used by the three apps.
2. Start the full stack from the repository root:

```bash
docker compose up --build
```

3. For local app-only development:

```bash
cd apps/web && npm install && npm run dev
cd apps/communication-server && npm install && npm run start:dev
cd apps/backend && ./mvnw spring-boot:run
```

## Seed Assets

- SQL reset scripts live in `data/seed`
- Spring seed resources remain in `apps/backend/src/main/resources`
- The root compose file mounts `apps/backend/src/main/resources` into the MySQL container at `/seed`

## Public Interfaces Kept Stable

- Web routes remain unchanged, including `/`, `/login`, `/signup`, `/motion`, `/calendar`, `/notifications`
- Spring REST paths remain unchanged under `/api/*`
- Communication server REST paths remain unchanged under `/api/notifications/*` and `/sms/*`
- Socket.IO event names remain unchanged

See `docs/architecture.md` for the intended internal structure and refactor direction.
