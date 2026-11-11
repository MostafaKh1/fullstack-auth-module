# backend/AGENTS.md

The API: NestJS 11 on Express 5, MongoDB through Mongoose, Zod, pino. Architecture and its reasons: [ADR 0005](../docs/adr/0005-backend-architecture.md) and [ADR 0010](../docs/adr/0010-controller-service-repository-layering.md) (the layering); the rules a reviewer checks: [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: back end").

## The shape in one screen

```
src/
├── main.ts           # parses configuration, then boots
├── app.setup.ts      # global wiring shared with the test harness (prefix, logger, shutdown hooks)
├── app.module.ts     # every module, lowest tier first, and the global filter
├── config/           # tier 1, global: the environment, read only through AppConfigService
├── logging/          # tier 1, global: pino, the request id, the redact list
├── core/             # tier 1, global: injectable providers of outside things (the clock)
├── common/           # no module: the filter, the pipe, the decorators, the Origin guard, the cookie service, errors/
├── database/         # tier 2: PersistenceModule over collections/, repositories/ and the health ping
├── auth/             # tier 3: AuthModule, the auth routes, AuthService and the services under it, the domain types
├── features/<name>/  # tier 4: one module per feature (users)
├── health/           # tier 4: the health check
└── test/             # the HTTP-seam suites and their harness; never built into dist/
```

- **Module tiers**: a module imports only from a lower tier, and `AppModule` lists them lowest first. A tier-4 module exports nothing and never imports another tier-4 module. `AuthModule` exports its services for tier 4 to inject. `common/` has no module: its files are imported one by one.
- **Three doors**: the database only through a repository, configuration only through `AppConfigService`, the current time only through `ClockService`. Each door's folder is the only place its library or global is touched.
- **Controller, service, repository**: a controller is the API only (extract the request, call one service method, call `AuthCookiesService`, map to the response type); a service holds the business logic and knows nothing about HTTP; a repository is the data access for one collection. The table and the lint rules are in [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Controller, service, repository").
- **The error envelope**: code throws `ApiError(code)` from `src/common/errors/`; the one global filter writes the envelope of [ADR 0002](../docs/adr/0002-api-errors-carry-codes-not-copy.md).
- Global wiring (prefix, pipes, middleware) goes in `app.setup.ts`, so tests run it too.

## Where does this file belong?

The first match wins:

1. A route, operation or request schema of Sign up, Sign in, refresh or Sign out -> [src/auth/AGENTS.md](src/auth/AGENTS.md).
2. Any other route or operation -> its feature: [src/features/AGENTS.md](src/features/AGENTS.md); the health check is [src/health/AGENTS.md](src/health/AGENTS.md).
3. A collection's schema or index -> [src/database/collections/AGENTS.md](src/database/collections/AGENTS.md); a query or a write -> [src/database/repositories/AGENTS.md](src/database/repositories/AGENTS.md).
4. An environment variable -> [src/config/AGENTS.md](src/config/AGENTS.md).
5. An error code, or a decorator, guard, pipe or filter that routes share -> [src/common/AGENTS.md](src/common/AGENTS.md).
6. A log field that carries a secret, or request-id behaviour -> [src/logging/AGENTS.md](src/logging/AGENTS.md).
7. A provider of something outside the process (the time, a future external client) -> [src/core/AGENTS.md](src/core/AGENTS.md).
8. A test -> [src/test/AGENTS.md](src/test/AGENTS.md).

A module's business logic is one `<area>.service.ts` beside its controller; a rule several operations share is a private function in that file, or a service of its own when another module needs it too (`SessionService`).

## Naming and exports

- Files and folders are kebab-case. A file carries its role as a suffix, and its class is the file name in PascalCase: `health.service.ts` -> `HealthService`, `clock.service.ts` -> `ClockService`, `persistence.module.ts` -> `PersistenceModule`, `origin-csrf.guard.ts` -> `OriginCsrfGuard`. The suffixes in use: `.module`, `.controller`, `.service`, `.repository`, `.collection`, `.guard`, `.pipe`, `.filter`, `.decorator`, `.types`, `.spec`. A file of plain functions or a class with no Nest role is named for what it is, without a suffix (`refresh-credential.ts`, `database-health.ts` -> `DatabaseHealth`).
- One class per file, as a named export. No default exports, no `index.ts` barrels: import the file that defines the thing.
- Injected classes are imported as values, not `import type`: Nest reads constructor types at runtime ([ADR 0005](../docs/adr/0005-backend-architecture.md), "Consequences").
- Domain names come from [GLOSSARY.md](../GLOSSARY.md): `signUp`, never `register`.

## Commands

`npm run dev` (reads `.env` if present; copy `.env.example`), `npm test`, `npm run typecheck`, `npm run build`, `npm start`. Lint and format run from the repository root.
