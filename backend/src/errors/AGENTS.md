# backend/src/errors/AGENTS.md

The error contract of [ADR 0002](../../../docs/adr/0002-api-errors-carry-codes-not-copy.md): one error class, one closed set of codes, one filter. The rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Errors").

## What is here

- `error-codes.ts`: `ERROR_CODES`, the closed set, each code with its HTTP `status` and `retryable`; the `ErrorEnvelope` and `ValidationIssue` (`{ path, code }`) types.
- `api-error.ts`: `ApiError(code, { issues?, message?, cause? })`, the one error application code throws. `message` is a developer hint, omitted from production responses.
- `api-exception.filter.ts`: the one global filter, registered in `src/app.module.ts`. It maps errors Nest or Express raise themselves through `CODE_BY_STATUS`, and turns anything else into `server.internal`, logged with its stack.

## Adding a code

A code is `<area>.<snake_case_condition>` (`auth.session_expired`); the spec's list in `docs/spec/auth-module.md` is the reference.
Add it to `ERROR_CODES`, and an entry to the front end's copy map in the same commit.
A new failure is a new code thrown as `ApiError`, never a new exception class or filter.
