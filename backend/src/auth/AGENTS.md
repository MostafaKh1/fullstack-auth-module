# src/auth/AGENTS.md

Authentication infrastructure, the tier between the database and the features: `PasswordHashService` (scrypt, ADR 0007), `AccessTokenService` (HS256 JWT carrying `sub` and `sid`), `SessionIssuerService` (starts a Session and issues both credentials, ADR 0001), and the global `AccessTokenGuard`.

- Every route needs an access token whose Session is live; mark a route `@Public()` only if it is Sign up, Sign in, refresh, Sign out or health.
- A protected route reads the signed-in User and Session with `@CurrentSession()` (`current-session.decorator.ts`).
- Whether a Session is live is decided in `session.rules.ts`, not in the repository.
- Pass `now` from the injected `Clock` into token and expiry logic; never read the time here.
