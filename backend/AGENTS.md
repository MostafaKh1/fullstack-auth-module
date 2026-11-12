# backend/AGENTS.md

The API: NestJS 11 on Express 5, MongoDB through Mongoose, Zod, pino. Architecture and its reasons: [ADR 0005](../docs/adr/0005-backend-architecture.md) and [ADR 0010](../docs/adr/0010-controller-service-repository-layering.md) (the layering); the rules a reviewer checks: [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: back end").

## The shape in one screen

Shared code is organised by kind, everything else by feature. Auth is a feature like any other.

```
src/
├── main.ts           # parses configuration, then boots
├── app.setup.ts      # createApp(): creates and wires the app for main.ts and the test harness (options, prefix, helmet, CORS, body parser, Swagger UI, logger)
├── app.module.ts     # every module, lowest tier first, and the global filter
├── config/           # global: the environment, read only through AppConfigService
├── docs/             # the OpenAPI document generated from the contract, and Swagger UI; export-openapi.ts writes contract/openapi.json
├── logging/          # global: pino, the request id, the redact list
├── core/             # global: injectable providers of outside things (the clock)
├── database/         # PersistenceModule, the only door to MongoDB: src/database/AGENTS.md
├── common/           # CommonModule and what the global wiring or several features share, by kind: src/common/AGENTS.md
├── features/<name>/  # one module per feature: auth, users, health
└── test/             # the HTTP-seam suites and their harness; never built into dist/
```

- **Module tiers**, lowest first: `AppConfigModule`, `LoggingModule`, `CoreModule` (global) -> `PersistenceModule` -> `CommonModule` -> feature modules. A module imports only from a lower tier, and `AppModule` lists them in that order. A feature module exports nothing; it imports `PersistenceModule` for repositories and `CommonModule` for the shared services.
- **Placement**: used by one feature, it lives beside that feature; used by more, or by the global wiring (the global guard, the filter, the body parser), it lives in `common/`. The test is the importers: `git grep` the file's path. A domain type the repositories or several features use lives in `common/types/` (`User`, `Session`), as does a type `common/` and a feature share (`AuthContext`, in `common/services/access-token.service.ts`). When a second feature needs a feature's file, move it to `common/` rather than import across. Two GritQL plugins in `lint/`, registered in the root `biome.jsonc`, enforce the direction: a feature imports nothing from another feature, and `config/`, `logging/`, `core/`, `database/` and `common/` import nothing from `features/`.
- **Three doors**: the database only through a repository, configuration only through `AppConfigService`, the current time only through `ClockService`. Each door's folder is the only place its library or global is touched ([CODING_STANDARDS.md](../CODING_STANDARDS.md), "Three doors").
- **ES modules**: the back end is ES modules (`"type": "module"`) because oRPC ships only ES modules and Jest cannot `require()` one on Node 22 ([ADR 0012](../docs/adr/0012-shared-orpc-contract-in-an-npm-workspace.md)). Every relative and `@/` import names the compiled file, `.js` included (`@/core/clock.service.js`); a file's own location is `import.meta.url`, never `__dirname`. Jest runs in its ES-module mode (the `test` script passes `--experimental-vm-modules`), where the `jest` object is not a global: import it from `@jest/globals` if a spec needs it.
- **Routes from the contract**: a route declared in `@app/contract` ([contract/AGENTS.md](../contract/AGENTS.md)) is a method of a `@Controller()` with no path, decorated `@Implement(contract.<feature>.<procedure>)` that returns `implement(contract.<feature>.<procedure>).handler(...)` calling one service method; the decorator sets the method, path and success status, under the `api` prefix. Guards and `@Public()` apply as on any route. oRPC sends the response itself and Nest replies again after it, which Express refuses for a `204`: a procedure whose success is `204` takes an unused `@Res()` parameter so Nest leaves the response alone (`AuthController.signOut`). The handler reads the request (headers, cookies) from `context.request` and adds response headers, the refresh cookie among them, to `context.resHeaders`; the input it receives has passed the procedure's Zod schema. `CommonModule` registers `ORPCModule` with `common/orpc/orpc-options.ts` (see "The error envelope"). Canonical examples: `features/health/`; for a body and a cookie, `AuthController.signUp`; for reading the cookie, `AuthController.refresh`; for a protected route reading the caller with `@CurrentAuth()`, `UsersController.me`.
- **Controller, service, repository**: a controller is the API only (extract the request, call one service method, call `AuthCookiesService`, map to the response type); a service holds the business logic and knows nothing about HTTP; a repository is the data access for one collection. Biome enforces the import rules, matching the `@/` form too ([CODING_STANDARDS.md](../CODING_STANDARDS.md), "Controller, service, repository").
- **Deny by default**: the global `AccessTokenGuard` (registered by `CommonModule`) requires a live Session on every route. Mark a route `@Public()` only if it is Sign up, Sign in, refresh, Sign out or health. Every route that sets or reads the refresh cookie (Sign up, Sign in, refresh, Sign out) is `@Public()` and carries `@UseGuards(OriginCsrfGuard)` (`features/auth/origin-csrf.guard.ts`): reading it, a cross-site request would use the victim's Session; setting it, it would plant the attacker's (login CSRF, [ADR 0001](../docs/adr/0001-session-record-with-short-lived-access-token.md)). A protected route reads who is calling with `@CurrentAuth()` (`features/users/current-auth.decorator.ts`; a second feature that needs it moves it to `common/decorators/`), an `AuthContext` (`{ userId, sessionId }`), and loads the User itself.
- **The error envelope**: code throws `ApiError(code)` from `src/common/errors/`, and the envelope of [ADR 0002](../docs/adr/0002-api-errors-carry-codes-not-copy.md) is written in two places ([ADR 0012](../docs/adr/0012-shared-orpc-contract-in-an-npm-workspace.md)). Inside a procedure, a caller's mistake (an `ApiError` with a 4xx code, or input the procedure's schema refused, mapped by `invalidRequest()` to `request.validation_failed` or `request.malformed`) becomes the typed error the contract declares and oRPC's error encoder writes the envelope (`common/orpc/orpc-options.ts`); every other error, a 5xx `ApiError` among them, is rethrown to the one global filter, which logs a 5xx with its stack. Outside a procedure (guards, a server-side failure of the body parser) the filter writes it.
- The application is created in one place, `createApp()` in `app.setup.ts`, which `main.ts` and the test harness both call, so tests run the same options and global wiring (prefix, helmet, CORS, the body parser, Swagger UI) as production; new wiring goes there. Nest's built-in body parsers are off: the API parses only JSON ([ADR 0001](../docs/adr/0001-session-record-with-short-lived-access-token.md)). The one parser is `common/middleware/json-body.middleware.ts`: it caps the body (`REQUEST_BODY_LIMIT`) and answers its client errors itself, `request.too_large` over the cap and `request.malformed` for anything else it cannot read (broken JSON, an unsupported charset or encoding), so a caller's mistake is never logged as a server error; its own failures go on to the global filter. A body it does not parse (a form, multipart, plain text) reaches oRPC as `null`, so oRPC never reads the stream itself, uncapped, and the procedure's input schema refuses it as `request.malformed`.
- **Throttling**: Sign up, Sign in and refresh carry `@UseGuards(ThrottlerGuard)`, listed before `OriginCsrfGuard` so a flood of foreign-origin requests is still counted (limit `THROTTLE_LIMIT` per `THROTTLE_TTL_SECONDS`, per IP); `ThrottlerModule` is configured in `AuthModule`. A new throttled route adds the same guard. Tests run with a limit high enough to never trip; a throttling spec lowers it.
- **Documenting a route**: the contract documents it: its procedure's `tags`, output and `.errors()` become its entry in the document, and a controller carries no Swagger decorator. `src/docs/api-document.ts` builds the document from the contract alone and serves it through Swagger UI; `api-docs.spec.ts` validates every route's real responses against it. Then regenerate `contract/openapi.json` ([contract/AGENTS.md](../contract/AGENTS.md)).

## Where does this file belong?

The first match wins:

1. A route or operation -> its feature in `src/features/<feature>/`. A new feature is a new kebab-case folder with its module, controller and service, imported in `src/app.module.ts`. The health check stays a liveness probe with no business logic; a new probe is a provider in `src/database/` (as `database-health.ts` is) or `src/core/`, called from `HealthService`.
2. A collection's schema, an index, a query or a write -> [src/database/AGENTS.md](src/database/AGENTS.md).
3. An error code, a domain type, or a decorator, guard, filter or service the global wiring or several features use -> [src/common/AGENTS.md](src/common/AGENTS.md).
4. An environment variable -> `src/config/app-env.ts`; see "Configuration".
5. A wrapper over something outside the process that tests must control (the time, an email sender, a third-party client) -> `src/core/<name>.service.ts`, listed in `core.module.ts`'s `providers` and `exports`. A duration or lifetime is configuration, not a constant there; a domain decision belongs in a feature's service.
6. A log field that carries a secret -> `REDACTED_PATHS` in `src/logging/logging.module.ts`.
7. A test -> `src/test/`; see "Tests".
8. An import rule `noRestrictedImports` cannot express -> a GritQL plugin `lint/<rule>.grit`, registered with its `includes` under `plugins` in the root `biome.jsonc`, and proven red by a planted import.

## Inside a feature

```
features/<feature>/
├── <feature>.module.ts        # imports PersistenceModule, CommonModule; exports nothing
├── <feature>.controller.ts    # the API only: one method per route, each calling one service method
├── <feature>.service.ts       # the business logic: one public method per operation (verb and object: getCurrentUser)
├── <feature>.types.ts         # the types only this feature uses, when it has them
├── <name>.<kind>.ts           # a guard or decorator only this feature uses (auth: origin-csrf.guard.ts)
└── services/                  # when the feature has more than one service (auth: AuthService, SessionService, ...)
```

- Logic two operations share, with no I/O -> a private function in the service's file; a service of its own only when the logic carries state or I/O of its own (`SessionService`, the Session lifecycle).
- Data access -> a repository method in `src/database/repositories/`, injected into the service; never into the controller.
- A service imports `Injectable` and nothing else from `@nestjs/common`, throws `ApiError`, takes the time from the injected `ClockService`, and returns domain types (`src/common/types/`).
- The controller reads and sets the refresh cookie through `AuthCookiesService`; `AuthService` returns the credential and never sees the response.
- Canonical example: `features/users/`; for a cookie route, `AuthService.signOut` with its controller method.

### The auth feature

- The request schemas are the contract's field rules (`@app/contract/auth/auth.field-rules`): each procedure's input, so a refused body answers through `invalidRequest()` (`common/errors/invalid-request.ts`): `400 request.validation_failed` with `{ path, code }` issues (`path` an array of keys), or `400 request.malformed` for a body that is not a JSON object; change a rule in `contract/`, never here. Every check's error is its rule id (`.max(254, "email.too_long")`).
- `refresh-credential.ts` is the only code that knows the `<sessionId>.<secret>` format; only `sha256(secret)` is stored.
- `services/auth-cookies.service.ts`: `AuthCookiesService` owns the whole cookie policy: `httpOnly`, `SameSite=Lax`, scoped to `/api/auth`, `Secure` from `COOKIE_SECURE`, `Expires` at the Session's idle expiry with a matching `Max-Age` from `ClockService`. It reads the cookie from the request (`context.request`) and adds the `Set-Cookie` line to oRPC's `context.resHeaders`. It is the one service that touches the response, so the services lint rule skips that file alone.
- `origin-csrf.guard.ts`: a foreign `Origin` answers `403 auth.origin_rejected`; a missing one passes. `services/password-hash.service.ts` is scrypt ([ADR 0007](../docs/adr/0007-password-hashing-with-scrypt.md)).
- A rule about a Session's lifecycle (rotation, the sliding idle expiry, the grace window, revocation) -> `services/session.service.ts`. Liveness is the guard's rule, `isSessionLive` in `src/common/guards/access-token.guard.ts`, which `SessionService` applies too.

## Configuration

Parsed and validated once at boot in `src/config/app-env.ts` (the one reader of `process.env`), then read only through `AppConfigService.get(key)`. A new variable touches, in one commit: the schema in `app-env.ts`, the `AppConfig` type and its mapping in `parseConfig` (`SCREAMING_SNAKE` -> `camelCase`), `backend/.env.example`, and `testEnv` in `src/test/boot.ts` when tests need a value. A rule across variables goes in the schema's `superRefine`. A constant that is not an environment variable stays in the module that uses it.

## Logging

Inject `PinoLogger` from `nestjs-pino` and call `setContext(ClassName.name)` in the constructor, as `src/common/filters/all-exceptions.filter.ts` does. Event names are dotted: `request.failed`, `session.started`. A secret-bearing field is added to `REDACTED_PATHS`, never masked at the call site. The request id (`src/logging/request-id.ts`) is on every line and is the envelope's `traceId`.

Development output is pretty-printed (`pino-pretty`, a devDependency, switched on in `src/logging/logging.module.ts`); every other environment logs JSON.

## Tests

The only test seam is the real application over HTTP (`api-docs.spec.ts` also pins `contract/openapi.json` to the generated document) against a throwaway MongoDB ([ADR 0004](../docs/adr/0004-quality-gates-and-test-seams.md)). Jest runs `src/test/**/*.spec.ts`; `tsconfig.build.json` excludes `src/test/`.

- A route's or module's behaviour -> `src/test/<area>.spec.ts`, named for what it covers; no spec sits beside source. Boot-time behaviour of `src/main.ts` -> `configuration.spec.ts`. A helper several specs use -> `src/test/support/<name>.ts`. How the app boots under test -> `src/test/boot.ts`.
- `startTestApp(env?)` in `beforeAll`, `app.close()` in `afterAll`. It boots `AppModule` through `createApp()`, as production does, and gives `http()` (supertest), `clock` (a `FakeClock` replacing `ClockService`), `startedAt`, `db` (the raw database), `logs()` and `stopDatabase()`.
- Seed and inspect through `app.db`, never through the repository under test. Clear the collections a spec writes to between examples: several worked examples normalise to the same email.
- Move time with `app.clock.set()` and `advance()` from `app.startedAt`. The clock starts at the real current time because MongoDB's TTL monitor deletes Sessions whose idle expiry has passed in real time.
- Pass `{ PASSWORD_HASH_COST: "10" }` when a file signs up many Users and is not testing the hash itself.
- The worked-examples table is `@app/contract/auth/auth.field-rules.examples`, shared with the front end; add a row there, never in a spec.
- Canonical example: `health.spec.ts`; `harness.spec.ts` pins the harness. The first run downloads a `mongod` binary into `~/.cache/mongodb-binaries`, shared by every checkout.

## Naming and exports

- Files and folders are kebab-case. A file carries its role as a suffix, and its class is the file name in PascalCase: `health.service.ts` -> `HealthService`, `origin-csrf.guard.ts` -> `OriginCsrfGuard`. The suffixes in use: `.module`, `.controller`, `.service`, `.repository`, `.collection`, `.guard`, `.filter`, `.decorator`, `.types`, `.spec`. A file of plain functions or a class with no Nest role is named for what it is (`refresh-credential.ts`, `database-health.ts` -> `DatabaseHealth`).
- **Imports**: anything that leaves its own folder imports through `@/`, rooted at `src/` (`import { ClockService } from "@/core/clock.service.js"`); a file imports a sibling in its own folder with `./`. Never `../`: Biome forbids it. `@/` is a `paths` entry in `tsconfig.json`, `moduleNameMapper` in `jest.config.js`, `alias-hooks.mjs` for plain Node running the sources, and `tsc-alias` after `tsc` in `build`, which rewrites it to relative paths in `dist/`.
- **Running the sources**: `register-ts.mjs` lets plain Node run `src/` as ES modules (ts-node compiles, `alias-hooks.mjs` resolves `@/`). `dev`, `openapi` and `openapi:check` pass it with `--import`; `node-register-args.json` holds the same arguments for `configuration.spec.ts` and the browser journeys, since a package script cannot read a file.
- One class per file, as a named export. No default exports, no `index.ts` barrels: import the file that defines the thing.
- Injected classes are imported as values, not `import type`: Nest reads constructor types at runtime ([ADR 0005](../docs/adr/0005-backend-architecture.md), "Consequences").
- A controller's field for its service is the class name in camelCase (`usersService`).
- Domain names come from [GLOSSARY.md](../GLOSSARY.md): `signUp`, never `register`.

## Container

`Dockerfile` builds the production image (build, production-dependencies and runtime stages, non-root) from the repository root, so it can install from the workspace lockfile and build the contract package first; the root `compose.yaml` wires it to MongoDB and the front end. A file a new stage needs is copied by its path from the root.

## Commands

Run them in `backend/`, or from the root with `-w backend`; each needs the contract built (`npm run build -w contract`; the root's scripts do it). `npm run dev` (reads `.env` if present; copy `.env.example`), `npm run openapi` (writes `../contract/openapi.json`; `openapi:check` fails when it is stale), `npm test`, `npm run typecheck`, `npm run build`, `npm start`. Install from the root (`npm ci`, or `npm install <pkg> -w backend`). Lint and format run from the repository root.
