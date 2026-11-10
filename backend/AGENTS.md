# backend/AGENTS.md

The API: NestJS 11 on Express 5, MongoDB through Mongoose, Zod, pino. Architecture and its reasons: [ADR 0005](../docs/adr/0005-backend-architecture.md); the rules a reviewer checks: [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: back end").

## The shape in one screen

- **Module tiers**, lowest first; a module imports only from a lower tier, and `AppModule` (`src/app.module.ts`) lists them in this order:
  1. `src/config/`, `src/logging/`, `src/clock/`: global modules, injectable everywhere without an import.
  2. `src/database/`: the connection, models and repositories.
  3. Authentication infrastructure (token service, password hasher, global guard): arrives with the Sign up and Sign in ticket, which creates its folder and its `AGENTS.md`.
  4. `src/features/<feature>/`: one module per feature; it exports nothing and never imports another feature.
- **Three doors**: the database only through a repository, configuration only through `AppConfigService`, the current time only through `Clock`. Each door's folder is the only place its library or global is touched.
- **One handler per operation**: `src/features/<feature>/handlers/<operation>.handler.ts`, one `execute`, no HTTP.
- **Controllers are transport**: extract the request, call one handler, shape the response, own the cookie.
- **The error envelope**: code throws `ApiError(code)` from `src/errors/`; the one global filter writes the envelope of [ADR 0002](../docs/adr/0002-api-errors-carry-codes-not-copy.md).
- `src/main.ts` parses configuration, then boots; `src/app.setup.ts` is the wiring shared with the test harness. Global wiring (prefix, pipes, middleware) goes in `app.setup.ts`, so tests run it too.

## Where does this file belong?

The first match wins:

1. A business operation (Sign up, refresh, check health) -> a handler in its feature: [src/features/AGENTS.md](src/features/AGENTS.md).
2. A route, or a request body's Zod schema -> the feature's controller and folder: [src/features/AGENTS.md](src/features/AGENTS.md).
3. A query, a model, a collection index -> [src/database/AGENTS.md](src/database/AGENTS.md).
4. An environment variable -> [src/config/AGENTS.md](src/config/AGENTS.md).
5. An error code -> [src/errors/AGENTS.md](src/errors/AGENTS.md).
6. A log field that carries a secret, or request-id behaviour -> [src/logging/AGENTS.md](src/logging/AGENTS.md).
7. Anything that reads the current time -> inject `Clock`: [src/clock/AGENTS.md](src/clock/AGENTS.md).
8. A test -> [test/AGENTS.md](test/AGENTS.md).

Pure logic shared by a feature's handlers is a sibling `*.rules.ts` of module-level functions, not a new folder.

## Naming and exports

- Files are kebab-case with a role suffix, and the class carries the matching suffix: `check-health.handler.ts` -> `CheckHealthHandler`, `database-health.repository.ts` -> `DatabaseHealthRepository`, `health.controller.ts`, `health.module.ts`, `api-exception.filter.ts`, `app-config.service.ts`, `config.schema.ts` (a Zod schema).
- One class per file, as a named export. No default exports, no `index.ts` barrels: import the file that defines the thing.
- Injected classes are imported as values, not `import type`: Nest reads constructor types at runtime ([ADR 0005](../docs/adr/0005-backend-architecture.md), "Consequences").
- Domain names come from [GLOSSARY.md](../GLOSSARY.md): `signUp`, never `register`.

## Commands

`npm run dev` (reads `.env` if present; copy `.env.example`), `npm test`, `npm run typecheck`, `npm run build`, `npm start`. Lint and format run from the repository root.
