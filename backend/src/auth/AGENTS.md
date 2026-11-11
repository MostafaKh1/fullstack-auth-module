# backend/src/auth/AGENTS.md

Authentication, tier 3: `AuthModule` holds the auth routes (`POST /api/auth/sign-up`, `sign-in`, `refresh`, `sign-out`), `AuthService` behind them and the services under it, and installs the global `AccessTokenGuard`. It exports `PasswordHashService`, `AccessTokenService` and `SessionService` for tier 4 to inject. The domain types every layer shares live here too. The layering is in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Controller, service, repository").

## Layout

```
auth/
├── auth.module.ts              # the one module: controller, services, the global guard
├── auth.controller.ts          # the API only: one method per route, each calling one AuthService method
├── auth.service.ts             # Sign up, Sign in, refresh, Sign out: the business logic of the routes
├── auth.types.ts               # the domain types (User, Session, AccessClaims), the request schemas (the field rules)
├── <name>.service.ts           # a service AuthService and the guard share (Session lifecycle, tokens, hashing)
├── refresh-credential.ts       # the only code that knows the `<sessionId>.<secret>` format
└── access-token.guard.ts       # the global deny-by-default guard
```

## Where does this file belong?

1. A new auth route -> a method on `auth.controller.ts` calling a new method on `AuthService`; `signOut` with its controller method is the example of a cookie route that clears the cookie.
2. A rule about a Session (live? within grace? how far the idle expiry slides? revoke?) -> `session.service.ts`, as a private function when it has no I/O.
3. A field rule, or a request body for an auth route -> `auth.types.ts`, the back end's copy of the field rules; the front end's copy is `frontend/src/components/composite/auth/AuthScreen/AuthScreenFieldRules.ts`. Change both, and both worked-examples tables, in the same commit.
4. A domain type a repository returns or a service passes on -> `auth.types.ts`; repositories import it as a type.
5. Anything about the refresh credential's format, minting, hashing or comparison -> `refresh-credential.ts`.
6. A decorator, guard or cookie helper another module's routes also use -> `src/common/`.

## Conventions

- Every route needs an access token whose Session is live; mark a route `@Public()` (`src/common/auth.decorator.ts`) only if it is Sign up, Sign in, refresh, Sign out or health.
- A cookie route (refresh, Sign out) is `@Public()` and carries `@UseGuards(OriginCsrfGuard)`.
- The controller reads and sets the refresh cookie through `AuthCookiesService`; `AuthService` returns the credential (`SignedIn.refreshCredential`) and never sees the response.
- Services take the time from the injected `ClockService`; the controller never does.
- Canonical example: `AuthService.signIn` with its controller method.

## Inventory

- `auth.service.ts`: `AuthService` (`signUp`, `signIn`, `refresh`, `signOut`) and `SignedIn`; a refresh answers `refreshCredential: null` within the grace window.
- `session.service.ts`: `SessionService` (`start`, `isLive`, `refresh`, `revoke`, `revokeForCredential`; ADR 0001) with the liveness, sliding idle expiry and grace rules; `StartedSession`, `RefreshedSession`, `IssuedRefreshCredential`. A wrong secret for a known Session revokes it.
- `refresh-credential.ts`: `mintRefreshCredential`, `parseRefreshCredential`, `secretMatches` (constant-time); only `sha256(secret)` is stored.
- `password-hash.service.ts`: `PasswordHashService` (scrypt, ADR 0007, passwords NFC-normalised first), with a decoy hash for unknown emails.
- `access-token.service.ts`: `AccessTokenService` (HS256 JWT carrying `sub` and `sid`).
- `access-token.guard.ts`: `AccessTokenGuard` and `AuthenticatedRequest`; asks `SessionService.isLive`.
- `auth.types.ts`: `User`, `Session`, `RevokedReason`, `AccessClaims`; `signUpSchema`, `signInSchema`, `SignUpBody`, `SignInBody`, where every check's error is its rule id.
