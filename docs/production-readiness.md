# FitMate Production Readiness

## Release Bar

FitMate handles health, body, workout, phone, and notification data. A paid
release must meet these gates before deployment:

- Production profile is enabled with `SPRING_PROFILES_ACTIVE=prod` and `NODE_ENV=production`.
- JWTs are issued through the `fitmate_auth` HttpOnly cookie, not URL query strings or browser token storage.
- `AUTH_COOKIE_SECURE=true` is used on HTTPS deployments.
- `APP_CORS_ALLOWED_ORIGIN_PATTERNS` and `CORS_ORIGINS` contain only owned production origins.
- `DATA_LOADER_ENABLED=false` and `DATA_LOADER_TEST_DATA_ENABLED=false`.
- `NOTIFICATION_SCHEDULER_ENABLED=false` until a production audience provider is connected.
- Database schema changes are applied through a reviewed migration plan before `spring.jpa.hibernate.ddl-auto=validate` starts.
- Error tracking, request metrics, and log retention are configured outside the app containers.

## Required Legal And Consent Surfaces

Before accepting real users, the product needs these user-facing pages or flows:

- Terms of service.
- Privacy policy covering health, body, workout, OAuth, SMS, and notification data.
- SMS consent and opt-out language.
- Account deletion and data export request path.
- OAuth provider disclosure for Google Calendar linking.

## Operational Runbook

For each release:

1. Rotate secrets and confirm `JWT_SECRET` is at least 32 characters.
2. Run backend, web, communication-server tests and builds.
3. Run `npm audit --audit-level=high` in both Node apps.
4. Confirm no development tunnel domains are present in production env values.
5. Confirm the notification scheduler is disabled unless its audience source has been reviewed.
6. Smoke test login, OAuth callback, profile, calendar, chat, notifications, logout, and account settings behind the production reverse proxy.
