# backend/src/health/AGENTS.md

`GET /api/health`, tier 4: whether the API and its database answer. Laid out as a feature ([src/features/AGENTS.md](../features/AGENTS.md), "Layout of a feature"), at the top level because it serves operators, not Users.

## Conventions

- The route is `@Public()`; it stays a liveness check and gains no business logic.
- A new probe (another dependency) is a provider in `src/database/` (as `database-health.ts` is) or `src/core/`, called from `HealthService`.

## Inventory

- `health.module.ts`: `HealthModule`, importing `PersistenceModule`.
- `health.controller.ts`: `HealthController`, one route.
- `health.service.ts`: `HealthService.check()` and `Health`; `503 server.unavailable` while the database is unreachable.
