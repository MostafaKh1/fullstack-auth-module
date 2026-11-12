# backend/src/common/AGENTS.md

What the global wiring (the global guard, the filter, the body parser) or more than one feature needs, organised by kind. The placement test is the importers: used by one feature, a file lives beside that feature; used by more, it lives here. `common/` sits below every feature and imports nothing from `src/features/` (a lint plugin in `backend/lint/` enforces it). The error rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Errors").

## Layout

```
common/
├── common.module.ts   # CommonModule: provides and exports AccessTokenService, registers the global AccessTokenGuard and ORPCModule
├── decorators/        # @Public() (auth.decorator.ts)
├── errors/            # error-envelope.ts (errorEnvelope(), the one envelope builder; the closed set of codes is the contract's), api-error.ts, invalid-request.ts (a refused body as its ApiError)
├── filters/           # the one global filter, registered in src/app.module.ts
├── middleware/        # the JSON body parser with its size cap and its envelope errors
├── orpc/              # orpc-options.ts: oRPC's options for one request (the context, the error encoder, the plugins)
├── guards/            # the global AccessTokenGuard and isSessionLive, the one liveness rule
├── services/          # the access token (and AuthContext)
└── types/             # the domain types the repositories and the features share: user.types.ts, session.types.ts
```

## Where does this file belong?

1. An error code -> `ERROR_CODES` in the contract's `common/error-envelope.ts` ([contract/AGENTS.md](../../../contract/AGENTS.md)); the envelope builder is `errors/error-envelope.ts`.
2. A decorator, guard or filter used by the global wiring or by more than one feature -> `<kind>s/<name>.<kind>.ts` here; one used by a single feature -> beside that feature's controller.
3. A service more than one feature injects -> `services/<name>.service.ts`, listed in `common.module.ts`'s `providers` and `exports`; one a single feature uses -> that feature's `services/`, provided by its module.
4. A domain type the repositories or more than one feature use -> `types/<entity>.types.ts`, one file per entity; a type only one feature uses stays in its `<feature>.types.ts`.

## Conventions

- The export is the file name in PascalCase plus the role (`access-token.guard.ts` -> `AccessTokenGuard`). A decorator file may export more than one decorator of the same concern (`auth.decorator.ts`).
- A domain type is the application's view of a record: never a secret hash. The repositories import it with `import type`, so no runtime edge points up from `src/database/`.
- A code is `<area>.<snake_case_condition>` (`auth.session_expired`), with its HTTP `status` and `retryable` in `ERROR_CODES` in the contract's `common/error-envelope.ts`; the spec's list in `docs/spec/auth-module.md` is the reference. Add it to the front end's copy map in the same commit.
- A new failure is a new code thrown as `ApiError`, never a new exception class or filter. Inside a contract procedure, `orpc-options.ts` turns a 4xx `ApiError` into the typed error the contract declares, which oRPC's encoder writes as the envelope, and rethrows everything else to the global filter; a new code a procedure answers is also added to that procedure's `.errors()` in the contract. The filter maps errors Nest or Express raise themselves through `CODE_BY_STATUS` and turns anything else into `server.internal`, logged with its stack.
- The guard needs only the access token and the Session record: it reads the Session through `SessionRepository` (so `CommonModule` imports `PersistenceModule`) and applies `isSessionLive`, the one liveness rule, which `SessionService` imports too.
- Canonical example: `guards/access-token.guard.ts`.
