# backend/src/common/AGENTS.md

Transport pieces that many routes share: the global filter, the validation pipe, the decorators, the `Origin` guard, the refresh cookie, and the error contract of [ADR 0002](../../../docs/adr/0002-api-errors-carry-codes-not-copy.md). There is no module here: each file is imported directly, and `AuthCookiesService` is provided by `AuthModule`. The error rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Errors").

## Where does this file belong?

1. An error code -> `errors/error-codes.ts`.
2. A decorator, guard, pipe, filter or interceptor used by routes of more than one module -> `<name>.<role>.ts` here.
3. One used by a single module -> beside that module's controller.

## Conventions

- File names are kebab-case with the Nest role as suffix; the export is the name in PascalCase plus the role (`route-validation.pipe.ts` -> `RouteValidationPipe`). A decorator file may export more than one decorator of the same concern (`auth.decorator.ts`).
- A code is `<area>.<snake_case_condition>` (`auth.session_expired`); the spec's list in `docs/spec/auth-module.md` is the reference. Add it to `ERROR_CODES` and to the front end's copy map in the same commit.
- A new failure is a new code thrown as `ApiError`, never a new exception class or filter.
- Canonical example: `origin-csrf.guard.ts`.

## Inventory

- `errors/error-codes.ts`: `ERROR_CODES`, the closed set, each code with its HTTP `status` and `retryable`; the `ErrorEnvelope` and `ValidationIssue` (`{ path, code }`) types.
- `errors/api-error.ts`: `ApiError(code, { issues?, message?, cause? })`, the one error application code throws. `message` is a developer hint, omitted from production responses.
- `all-exceptions.filter.ts`: `AllExceptionsFilter`, the one global filter, registered in `src/app.module.ts`. It maps errors Nest or Express raise themselves through `CODE_BY_STATUS`, and turns anything else into `server.internal`, logged with its stack.
- `route-validation.pipe.ts`: `RouteValidationPipe(schema)` parses a body and answers `400 request.validation_failed` with `{ path, code }` issues, or `400 request.malformed` for a body that is not a JSON object. Give every check in a schema its rule id as the error (`.max(254, "email.too_long")`).
- `auth.decorator.ts`: `Public()` and `IS_PUBLIC`, the opt-out from the global guard.
- `current-user.decorator.ts`: `@CurrentUser()`, the signed-in User and Session (`AccessClaims`) of a protected route.
- `origin-csrf.guard.ts`: `OriginCsrfGuard`, the `Origin` check of the cookie routes: a foreign `Origin` answers `403 auth.origin_rejected`, a missing one passes.
- `auth-cookies.service.ts`: `AuthCookiesService` (`setRefreshCookie`, `readRefreshCookie`) and `REFRESH_COOKIE`; the cookie is `httpOnly`, `SameSite=Lax`, scoped to `/api/auth`.
