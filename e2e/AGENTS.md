# e2e/AGENTS.md

The Playwright journeys: the third test seam of [ADR 0004](../docs/adr/0004-quality-gates-and-test-seams.md). A real Chromium drives the real front end and back end over a real MongoDB, to catch drift between the apps (paths, cookie scope, the proxy, CORS), not edge cases. A third independent npm app ([ADR 0003](../docs/adr/0003-two-npm-apps-without-workspace-tooling.md)).

- **Run**: `npm ci`, `npx playwright install chromium`, then `npm test` in this folder (or `npm run e2e` from the root). `playwright.config.ts` starts both apps on ports 3100 and 5174, so it never meets the development servers.
- **The database**: `E2E_MONGODB_URI` if set (CI's `mongo:8` service container); otherwise `support/start-backend.mjs` starts a throwaway `mongodb-memory-server`, so no Docker is needed locally.
- **A new journey** goes in `tests/`, one file per area, with a fresh email address per run (the database is not reset). Locate by role and label, assert with web-first `expect`, never sleep. Add a journey only for a path that crosses both apps.
- **Containers**: the root `compose.yaml` runs the whole stack (`docker compose up --build`, then http://localhost:8080); CI builds both images and waits for every health check.
