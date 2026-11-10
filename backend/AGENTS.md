# backend/AGENTS.md

The API: NestJS 11 on Express 5, MongoDB through Mongoose, Zod, pino. Architecture and its reasons: [ADR 0005](../docs/adr/0005-backend-architecture.md); rules a reviewer checks: [CODING_STANDARDS.md](../CODING_STANDARDS.md).

## Where things are

- `src/main.ts` parses configuration, then boots; `src/app.setup.ts` is wiring shared with the test harness. Add global wiring there, never only in `main.ts`.
- `src/config/`: the environment schema (`config.schema.ts`) and `AppConfigService`. A new variable goes in the schema and in `.env.example` together.
- `src/logging/`: pino setup, the request id, and `REDACTED_PATHS`. A new secret-bearing field is added to that list.
- `src/clock/`: `Clock`, the only source of the current time.
- `src/errors/`: `ApiError`, the closed set of codes with their status and `retryable`, and the one global exception filter (ADR 0002). A new code is added here and to the front end's copy map in the same change.
- `src/database/`: the connection, models and repositories; the only place that imports `mongoose`.
- `src/features/<feature>/`: one module, one controller, and `handlers/<operation>.handler.ts`.

## Tests

- Every test drives the HTTP seam (ADR 0004): `test/**/*.spec.ts`, booted with `startTestApp()` from `test/support/test-app.ts`. It gives a supertest client, a `FakeClock`, the raw `Db` for seeding and inspection, the captured log lines, and `stopDatabase()`.
- Each test file gets its own throwaway MongoDB; clear the collections a test writes to between examples.
- The first run downloads a `mongod` binary into `~/.cache/mongodb-binaries`.

## Commands

`npm run dev` (reads `.env` if present; copy `.env.example`), `npm test`, `npm run typecheck`, `npm run build`, `npm start`. Lint and format run from the repository root.
