# src/auth/AGENTS.md

Authentication infrastructure, the tier between the database and the features: `PasswordHashService` (scrypt, ADR 0007), `AccessTokenService` (HS256 JWT carrying `sub` and `sid`), `SessionIssuerService` (starts a Session and issues both credentials, ADR 0001), the global `AccessTokenGuard`, and `OriginGuard`, the `Origin` check of the cookie routes.

- Every route needs an access token whose Session is live; mark a route `@Public()` only if it is Sign up, Sign in, refresh, Sign out or health.
- A cookie route (refresh, Sign out) is `@Public()` and carries `@UseGuards(OriginGuard)` (`origin.guard.ts`): a foreign `Origin` answers `403 auth.origin_rejected`, a missing one passes.
- A protected route reads the signed-in User and Session with `@CurrentSession()` (`current-session.decorator.ts`).
- Whether a Session is live, how far a refresh slides its idle expiry, and whether a replaced secret is still within the grace window are decided in `session.rules.ts`, not in the repository. `session-issuer.service.ts` also exports the secret helpers (`mintSecret`, `hashSecret`, `secretMatches`, constant-time).
- Pass `now` from the injected `Clock` into token and expiry logic; never read the time here.
