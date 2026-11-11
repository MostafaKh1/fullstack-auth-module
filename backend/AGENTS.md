# backend/AGENTS.md

The API: NestJS 11 on Express 5, MongoDB through Mongoose, Zod, pino. Architecture and its reasons: [ADR 0005](../docs/adr/0005-backend-architecture.md) and [ADR 0010](../docs/adr/0010-controller-service-repository-layering.md) (the layering); the rules a reviewer checks: [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: back end").

## The shape in one screen

Shared code is organised by kind, everything else by feature. Auth is a feature like any other.

```
src/
├── main.ts           # parses configuration, then boots
├── app.setup.ts      # global wiring shared with the test harness (prefix, helmet, CORS, body parser, Swagger UI, logger)
├── app.module.ts     # every module, lowest tier first, and the global filter
├── config/           # global: the environment, read only through AppConfigService
├── docs/             # the OpenAPI document and Swagger UI; export-openapi.ts writes contract/openapi.json
├── logging/          # global: pino, the request id, the redact list
├── core/             # global: injectable providers of outside things (the clock)
├── database/         # PersistenceModule, the only door to MongoDB: src/database/AGENTS.md
├── common/           # CommonModule and what the global guard or several features share, by kind: src/common/AGENTS.md
├── features/<name>/  # one module per feature: auth, users, health
└── test/             # the HTTP-seam suites and their harness; never built into dist/
```

- **Module tiers**, lowest first: `AppConfigModule`, `LoggingModule`, `CoreModule` (global) -> `PersistenceModule` -> `CommonModule` -> feature modules. A module imports only from a lower tier, and `AppModule` lists them in that order. A feature module exports nothing and never imports another feature module; it imports `PersistenceModule` for repositories and `CommonModule` for the shared services.
- **What goes in `common/`**: what the global guard or more than one feature needs. What only one feature needs stays in that feature. A type `common/` and a feature both need lives in `common/` (`AuthContext`), and the feature imports it; `common/` imports nothing from `features/`.
- **Three doors**: the database only through a repository, configuration only through `AppConfigService`, the current time only through `ClockService`. Each door's folder is the only place its library or global is touched ([CODING_STANDARDS.md](../CODING_STANDARDS.md), "Three doors").
- **Controller, service, repository**: a controller is the API only (extract the request, call one service method, call `AuthCookiesService`, map to the response type); a service holds the business logic and knows nothing about HTTP; a repository is the data access for one collection. Biome enforces the import rules ([CODING_STANDARDS.md](../CODING_STANDARDS.md), "Controller, service, repository").
- **Deny by default**: the global `AccessTokenGuard` (registered by `CommonModule`) requires a live Session on every route. Mark a route `@Public()` only if it is Sign up, Sign in, refresh, Sign out or health. A cookie route (refresh, Sign out) is `@Public()` and carries `@UseGuards(OriginCsrfGuard)`. A protected route reads who is calling with `@CurrentAuth()`, an `AuthContext` (`{ userId, sessionId }`), and loads the User itself.
- **The error envelope**: code throws `ApiError(code)` from `src/common/errors/`; the one global filter writes the envelope of [ADR 0002](../docs/adr/0002-api-errors-carry-codes-not-copy.md).
- Global wiring (prefix, helmet, CORS, the body parser, Swagger UI) goes in `app.setup.ts`, so tests run it too. The JSON body parser is `common/middleware/json-body.middleware.ts`: it caps the body (`REQUEST_BODY_LIMIT`) and renders `request.too_large` and `request.malformed` itself, because parser errors never reach the global filter.
- **Throttling**: Sign up, Sign in and refresh carry `@UseGuards(ThrottlerGuard)` (refresh lists it before `OriginCsrfGuard`) (limit `THROTTLE_LIMIT` per `THROTTLE_TTL_SECONDS`, per IP); `ThrottlerModule` is configured in `AuthModule`. A new throttled route adds the same guard. Tests run with a limit high enough to never trip; a throttling spec lowers it.
- **Documenting a route**: every route carries `@ApiTags`, an `@ApiResponse` for its success and `@ApiErrors(...codes)` (`common/decorators/api-errors.decorator.ts`) for its errors; a protected route adds `@ApiBearerAuth("bearer")`. Schemas are referenced by name from `SCHEMAS` in `src/docs/api-document.ts`. Then regenerate the contract ([contract/AGENTS.md](../contract/AGENTS.md)).

## Where does this file belong?

The first match wins:

1. A route or operation -> its feature in `src/features/<feature>/`. A new feature is a new kebab-case folder with its module, controller and service, imported in `src/app.module.ts`. The health check stays a liveness probe with no business logic; a new probe is a provider in `src/database/` (as `database-health.ts` is) or `src/core/`, called from `HealthService`.
2. A collection's schema, an index, a query or a write -> [src/database/AGENTS.md](src/database/AGENTS.md).
3. An error code, or a decorator, guard, pipe, filter or service the global guard or several features use -> [src/common/AGENTS.md](src/common/AGENTS.md).
4. An environment variable -> `src/config/app-env.ts`; see "Configuration".
5. A wrapper over something outside the process that tests must control (the time, an email sender, a third-party client) -> `src/core/<name>.service.ts`, listed in `core.module.ts`'s `providers` and `exports`. A duration or lifetime is configuration, not a constant there; a domain decision belongs in a feature's service.
6. A log field that carries a secret -> `REDACTED_PATHS` in `src/logging/logging.module.ts`.
7. A test -> `src/test/`; see "Tests".

## Inside a feature

```
features/<feature>/
├── <feature>.module.ts        # imports PersistenceModule, CommonModule; exports nothing
├── <feature>.controller.ts    # the API only: one method per route, each calling one service method
├── <feature>.service.ts       # the business logic: one public method per operation (verb and object: getCurrentUser)
├── <feature>.types.ts         # the domain types and the Zod request schemas, when the feature has them
└── services/                  # when the feature has more than one service (auth: AuthService, SessionService)
```

- Logic two operations share, with no I/O -> a private function in the service's file; a service of its own only when the logic carries state or I/O of its own (`SessionService`, the Session lifecycle).
- Data access -> a repository method in `src/database/repositories/`, injected into the service; never into the controller.
- A service imports `Injectable` and nothing else from `@nestjs/common`, throws `ApiError`, takes the time from the injected `ClockService`, and returns domain types (`src/features/auth/auth.types.ts`).
- The controller reads and sets the refresh cookie through `AuthCookiesService`; `AuthService` returns the credential and never sees the response.
- Canonical example: `features/users/`; for a cookie route, `AuthService.signOut` with its controller method.

### The auth feature

- `auth.types.ts` holds the domain types (`User`, `Session`, `RevokedReason`) and the request schemas, the back end's copy of the field rules; the front end's copy is `frontend/src/components/composite/AuthScreen/AuthScreenFieldRules.ts`. Change both, and both worked-examples tables, in the same commit. Every check's error is its rule id (`.max(254, "email.too_long")`).
- `refresh-credential.ts` is the only code that knows the `<sessionId>.<secret>` format; only `sha256(secret)` is stored.
- A rule about a Session's lifecycle (rotation, the sliding idle expiry, the grace window, revocation) -> `services/session.service.ts`. Liveness is the guard's rule, `isSessionLive` in `src/common/guards/access-token.guard.ts`, which `SessionService` applies too.

## Configuration

Parsed and validated once at boot in `src/config/app-env.ts` (the one reader of `process.env`), then read only through `AppConfigService.get(key)`. A new variable touches, in one commit: the schema in `app-env.ts`, the `AppConfig` type and its mapping in `parseConfig` (`SCREAMING_SNAKE` -> `camelCase`), `backend/.env.example`, and `testEnv` in `src/test/boot.ts` when tests need a value. A rule across variables goes in the schema's `superRefine`. A constant that is not an environment variable stays in the module that uses it.

## Logging

Inject `PinoLogger` from `nestjs-pino` and call `setContext(ClassName.name)` in the constructor, as `src/common/filters/all-exceptions.filter.ts` does. Event names are dotted: `request.failed`, `session.started`. A secret-bearing field is added to `REDACTED_PATHS`, never masked at the call site. The request id (`src/logging/request-id.ts`) is on every line and is the envelope's `traceId`.

## Tests

The only test seam is the real application over HTTP (`api-docs.spec.ts` also pins `contract/openapi.json` to the generated document) against a throwaway MongoDB ([ADR 0004](../docs/adr/0004-quality-gates-and-test-seams.md)). Jest runs `src/test/**/*.spec.ts`; `tsconfig.build.json` excludes `src/test/`.

- A route's or module's behaviour -> `src/test/<area>.spec.ts`, named for what it covers; no spec sits beside source. Boot-time behaviour of `src/main.ts` -> `configuration.spec.ts`. A helper several specs use -> `src/test/support/<name>.ts`. How the app boots under test -> `src/test/boot.ts`.
- `startTestApp(env?)` in `beforeAll`, `app.close()` in `afterAll`. It boots `AppModule` as production does and gives `http()` (supertest), `clock` (a `FakeClock` replacing `ClockService`), `startedAt`, `db` (the raw database), `logs()` and `stopDatabase()`.
- Seed and inspect through `app.db`, never through the repository under test. Clear the collections a spec writes to between examples: several worked examples normalise to the same email.
- Move time with `app.clock.set()` and `advance()` from `app.startedAt`. The clock starts at the real current time because MongoDB's TTL monitor deletes Sessions whose idle expiry has passed in real time.
- Pass `{ PASSWORD_HASH_COST: "10" }` when a file signs up many Users and is not testing the hash itself.
- `src/test/support/field-rules.examples.ts` and the front end's `AuthScreenFieldRules.examples.ts` are one table kept twice; change a row in both.
- Canonical example: `health.spec.ts`; `harness.spec.ts` pins the harness. The first run downloads a `mongod` binary into `~/.cache/mongodb-binaries`, shared by every checkout.

## Naming and exports

- Files and folders are kebab-case. A file carries its role as a suffix, and its class is the file name in PascalCase: `health.service.ts` -> `HealthService`, `origin-csrf.guard.ts` -> `OriginCsrfGuard`. The suffixes in use: `.module`, `.controller`, `.service`, `.repository`, `.collection`, `.guard`, `.pipe`, `.filter`, `.decorator`, `.types`, `.spec`. A file of plain functions or a class with no Nest role is named for what it is (`refresh-credential.ts`, `database-health.ts` -> `DatabaseHealth`).
- One class per file, as a named export. No default exports, no `index.ts` barrels: import the file that defines the thing.
- Injected classes are imported as values, not `import type`: Nest reads constructor types at runtime ([ADR 0005](../docs/adr/0005-backend-architecture.md), "Consequences").
- A controller's field for its service is the class name in camelCase (`usersService`).
- Domain names come from [GLOSSARY.md](../GLOSSARY.md): `signUp`, never `register`.

## Container

`Dockerfile` builds the production image (build, production-dependencies and runtime stages, non-root); the root `compose.yaml` wires it to MongoDB and the front end.

## Commands

`npm run dev` (reads `.env` if present; copy `.env.example`), `npm run openapi` (writes `../contract/openapi.json`; `openapi:check` fails when it is stale), `npm test`, `npm run typecheck`, `npm run build`, `npm start`. Lint and format run from the repository root.
