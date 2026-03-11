# FitMate Architecture

## Top-Level Responsibility Split

- `apps/backend`: Spring Boot application for authentication, profile, analytics, calendar, workout, and exercise APIs
- `apps/web`: React application for user-facing flows and admin-facing chat/notification views
- `apps/communication-server`: NestJS service for notifications, chat sockets, SMS, and scheduler jobs
- `infra/nginx`: reverse proxy, SPA serving, and public route stitching
- `data/seed`: manually managed SQL/CSV assets

## Internal Structure Goals

### Web

- `src/app`: router, providers, app shell, and global entrypoints
- `src/features`: route-level features and feature-specific UI
- `src/shared`: reusable UI, config, API helpers, storage helpers, and shared types

### Backend

- `backend.fitmate.auth`, `user`, `exercise`, `calendar`, `dashboard`, `analytics`: feature packages
- `backend.fitmate.common`: shared config, security, exception handling, and seed loading
- Controllers should accept DTOs instead of generic maps
- Feature services should hold business logic; controllers should stay thin

### Communication Server

- `chat`, `notifications`, and `sms` remain feature roots
- `shared/config`, `shared/redis`, and `shared/database` hold cross-cutting concerns
- Gateway transport concerns should stay separate from persistence and notification orchestration

## Compatibility Rules

- Keep public API paths stable
- Keep frontend route paths stable
- Keep Socket.IO event names stable
- Prefer internal adapters or compatibility wrappers over public behavior changes
