# Back-end architecture: NestJS 11, repositories over Mongoose, Zod, pino, module tiers

The back end is NestJS 11 on Express 5, not NestJS 12: 12 had shipped only weeks before this project started, and the libraries the design leans on (`@nestjs/mongoose`, `nestjs-pino`, `@nestjs/swagger`) are proven against 11.
MongoDB is reached through Mongoose, but only behind repositories in `src/database/`: nothing else imports `mongoose` or a model, so the query surface stays small enough to read in one place and secret fields can be kept out of every default projection.
Zod parses both the environment at boot (every bad variable named at once, the process exits non-zero, a value is never echoed because it may be a secret) and request bodies, so one schema language carries the field rules and their rule ids (ADR 0002) instead of `class-validator` decorators.
pino, through `nestjs-pino`, writes one JSON line per event with the request id on every line; the request id is also the error envelope's `traceId` and the `X-Request-Id` header, and secret-bearing paths are redacted by a single list rather than masked by hand.

~~Each business operation is one `@Injectable()` handler with a single `execute` method that knows nothing about HTTP; controllers only extract the request, call one handler and shape the response, including the cookie.~~
**Superseded by [ADR 0010](0010-controller-service-repository-layering.md):** the paragraph above, and the rejection of "services grouping several operations" below. The back end is now layered controller, service, repository; the rest of this ADR stands.
The modules form tiers, lowest first: configuration, logging and `core/` (the clock, and later any external client), all global -> the database (`PersistenceModule`: the connection, `collections/`, `repositories/`) -> the shared tier (`CommonModule` in `src/common/`~~: the token service, the password hasher, the cookie service, the global guard, beside the filter, the validation pipe, the decorators, the `Origin` guard and the error codes, organised by kind~~) -> the feature modules (`src/features/auth/`, `src/features/users/`, `src/features/health/`). A module imports only from a lower tier and a feature module exports nothing, so there are no cycles and `forwardRef` is never needed.
**Amended by [ADR 0012](0012-shared-orpc-contract-in-an-npm-workspace.md):** routes are declared in the shared oRPC contract, and a controller method implements one procedure with `@Implement`; the API is documented from the contract, not with `@nestjs/swagger` decorators.

**Amended:** what sits in the shared tier is decided by who imports it, so a file's location tells a reader who depends on it. Used by one feature, a file lives beside that feature; used by more, or by the global wiring (the global guard, the filter, the body parser), it lives in `src/common/`, organised by kind. So `src/common/` holds the access-token service and `AuthContext`, the global guard, the filter, the body parser, the envelope builder, `@Public()`, and the domain types (`User`, `Session`) in `src/common/types/`; the password hasher, the cookie service, the validation pipe and the `Origin` guard live in `src/features/auth/`, and `@CurrentAuth()` in `src/features/users/`. A feature imports nothing from another feature, and the tiers below the features import nothing from them; when a second feature needs a feature's file, the file moves to `src/common/`.

Configuration is parsed in `main.ts` before Nest is created and handed to `AppModule.forRoot(config)`, so the test harness builds the identical module from a test environment and swaps only the clock and the log destination.

## Considered options

- **NestJS 12.** Newest, but too new for its ecosystem at the time; moving up later is a version bump, not a redesign.
- **Mongoose models injected straight into services.** Less code, but every service then owns queries and projections, and a forgotten projection leaks a hash.
- **`class-validator` and `@nestjs/config` with Joi.** Nest's defaults, but two validation languages, and neither produces the `{ path, code }` rule ids the front end maps without a custom translation layer.
- **Nest's built-in logger.** Unstructured text, no request id, no redaction.
- **Services grouping several operations.** Fewer files, but a service with many public methods hides each operation's ordering and failure policy among the others. (Superseded: chosen by ADR 0010.)
- **Everything the auth feature touches in `src/common/`.** One place for the security plumbing, but then `src/common/` no longer says "shared", and a reader cannot tell a file two features rely on from one only Sign in uses.
- **The domain types in the auth feature, or in a tier of their own below the database.** In the auth feature, `users` and the repositories import from a feature; a separate bottom tier is one more top-level folder for two type files. In `src/common/types/`, the repositories' import points up a tier, but as `import type` it leaves no runtime edge.

## Consequences

- Nest's dependency injection reads constructor parameter types at runtime, so injected classes are imported as values: Biome's `useImportType` is off for `backend/` (ADR 0004).
- `noRestrictedImports` cannot express "any feature but the importer's own", so two GritQL plugins in `backend/lint/`, registered in `biome.jsonc`, enforce the feature boundaries: one matches the importer's feature from its path.
- Code that needs the time injects `ClockService` (`src/core/clock.service.ts`); tests replace it, so expiry and grace windows are tested without waiting.
