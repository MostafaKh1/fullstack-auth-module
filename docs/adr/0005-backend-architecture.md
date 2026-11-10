# Back-end architecture: NestJS 11, repositories over Mongoose, Zod, pino, one handler per operation, module tiers

The back end is NestJS 11 on Express 5, not NestJS 12: 12 had shipped only weeks before this project started, and the libraries the design leans on (`@nestjs/mongoose`, `nestjs-pino`, `@nestjs/swagger`) are proven against 11.
MongoDB is reached through Mongoose, but only behind repositories in `src/database/`: nothing else imports `mongoose` or a model, so the query surface stays small enough to read in one place and secret fields can be kept out of every default projection.
Zod parses both the environment at boot (every bad variable named at once, the process exits non-zero, a value is never echoed because it may be a secret) and request bodies, so one schema language carries the field rules and their rule ids (ADR 0002) instead of `class-validator` decorators.
pino, through `nestjs-pino`, writes one JSON line per event with the request id on every line; the request id is also the error envelope's `traceId` and the `X-Request-Id` header, and secret-bearing paths are redacted by a single list rather than masked by hand.

Each business operation is one `@Injectable()` handler with a single `execute` method that knows nothing about HTTP; controllers only extract the request, call one handler and shape the response, including the cookie.
The modules form tiers, lowest first: configuration, logging and the clock (global) -> the database (connection, models, repositories) -> authentication infrastructure (token service, password hasher, global guard) -> the feature modules (auth, users, health). A module imports only from a lower tier and a feature module exports nothing, so there are no cycles and `forwardRef` is never needed.

Configuration is parsed in `main.ts` before Nest is created and handed to `AppModule.forRoot(config)`, so the test harness builds the identical module from a test environment and swaps only the clock and the log destination.

## Considered options

- **NestJS 12.** Newest, but too new for its ecosystem at the time; moving up later is a version bump, not a redesign.
- **Mongoose models injected straight into services.** Less code, but every service then owns queries and projections, and a forgotten projection leaks a hash.
- **`class-validator` and `@nestjs/config` with Joi.** Nest's defaults, but two validation languages, and neither produces the `{ path, code }` rule ids the front end maps without a custom translation layer.
- **Nest's built-in logger.** Unstructured text, no request id, no redaction.
- **Services grouping several operations.** Fewer files, but a service with many public methods hides each operation's ordering and failure policy among the others.

## Consequences

- Nest's dependency injection reads constructor parameter types at runtime, so injected classes are imported as values: Biome's `useImportType` is off for `backend/` (ADR 0004).
- Code that needs the time injects `Clock`; tests replace it, so expiry and grace windows are tested without waiting.
