# backend/src/common/AGENTS.md

What the global guard or more than one feature needs, organised by kind. `common/` sits below every feature: it imports nothing from `src/features/`, and a type both sides need lives here (`AuthContext`). The error rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Errors").

## Layout

```
common/
├── common.module.ts   # CommonModule: provides and exports the services, registers the global AccessTokenGuard
├── decorators/        # @Public() (auth.decorator.ts), @CurrentAuth()
├── errors/            # error-codes.ts (the closed set), api-error.ts (ApiError)
├── filters/           # the one global filter, registered in src/app.module.ts
├── guards/            # the global AccessTokenGuard, the Origin check of the cookie routes
├── pipes/             # RouteValidationPipe(schema)
└── services/          # the access token (and AuthContext), the password hasher, the refresh cookie
```

## Where does this file belong?

1. An error code -> `errors/error-codes.ts`.
2. A decorator, guard, pipe or filter used by the global guard or by more than one feature -> `<kind>s/<name>.<kind>.ts` here; one used by a single feature -> beside that feature's controller.
3. A service more than one feature injects -> `services/<name>.service.ts`, listed in `common.module.ts`'s `providers` and `exports`; one a single feature uses -> that feature.

## Conventions

- The export is the file name in PascalCase plus the role (`route-validation.pipe.ts` -> `RouteValidationPipe`). A decorator file may export more than one decorator of the same concern (`auth.decorator.ts`).
- A code is `<area>.<snake_case_condition>` (`auth.session_expired`), with its HTTP `status` and `retryable` in `ERROR_CODES`; the spec's list in `docs/spec/auth-module.md` is the reference. Add it to the front end's copy map in the same commit.
- A new failure is a new code thrown as `ApiError`, never a new exception class or filter. The filter maps errors Nest or Express raise themselves through `CODE_BY_STATUS` and turns anything else into `server.internal`, logged with its stack.
- `RouteValidationPipe` answers `400 request.validation_failed` with `{ path, code }` issues (`path` an array of keys), or `400 request.malformed` for a body that is not a JSON object.
- The guard needs only the access token and the Session record: it reads the Session through `SessionRepository` (so `CommonModule` imports `PersistenceModule`) and applies `isSessionLive`, the one liveness rule, which `SessionService` imports too.
- `AuthCookiesService` owns the whole cookie policy: `httpOnly`, `SameSite=Lax`, scoped to `/api/auth`, `Secure` from `COOKIE_SECURE`, `Expires` at the Session's idle expiry with a matching `Max-Age` from `ClockService`. It writes the `Set-Cookie` line itself because Express's `res.cookie` derives `Expires` from the real clock. It is the one service that touches the response, so the services lint rule skips that file alone.
- `OriginCsrfGuard`: a foreign `Origin` answers `403 auth.origin_rejected`; a missing one passes.
- Canonical example: `guards/origin-csrf.guard.ts`.
