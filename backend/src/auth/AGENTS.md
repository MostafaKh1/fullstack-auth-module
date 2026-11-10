# backend/src/auth/AGENTS.md

Authentication, tier 3: `AuthModule` holds the auth routes (`POST /api/auth/sign-up`, `sign-in`, `refresh`) and the services under them, and installs the global `AccessTokenGuard`. It exports `PasswordHashService`, `AccessTokenService` and `SessionIssuerService` for tier 4 to inject.

## Layout

```
auth/
├── auth.module.ts              # the one module: controller, handlers, services, the global guard
├── auth.controller.ts          # one method per route, each calling one handler
├── auth.types.ts               # the request schemas (the field rules) and their body types
├── <name>.service.ts           # an injectable the handlers share (hashing, tokens, Session issuing)
├── access-token.guard.ts       # the global deny-by-default guard
├── session.rules.ts            # pure decisions about a Session, `now` passed in
└── handlers/
    └── <operation>.handler.ts  # one per operation
```

## Where does this file belong?

1. A new auth route (Sign out) -> a method on `auth.controller.ts`, plus `handlers/<operation>.handler.ts` exporting `<Operation>Handler`, listed in `auth.module.ts`'s `providers`.
2. A field rule, or a request body for an auth route -> `auth.types.ts`, the back end's copy of the field rules; the front end's copy is `frontend/src/components/composite/auth/AuthScreen/AuthScreenFieldRules.ts`. Change both, and both worked-examples tables, in the same commit.
3. A decision about a Session with no I/O (live? within grace? how far the idle expiry slides?) -> `session.rules.ts`.
4. A decorator, guard or cookie helper another module's routes also use -> `src/common/`.

## Conventions

- Every route needs an access token whose Session is live; mark a route `@Public()` (`src/common/auth.decorator.ts`) only if it is Sign up, Sign in, refresh, Sign out or health.
- A cookie route (refresh, Sign out) is `@Public()` and carries `@UseGuards(OriginCsrfGuard)`.
- The controller sets and reads the refresh cookie through the injected `AuthCookiesService`; handlers return the credential and never touch the response.
- Pass `now` from the injected `ClockService` into token and expiry logic.
- Canonical example: `handlers/sign-in.handler.ts` with its controller method.

## Inventory

- `password-hash.service.ts`: `PasswordHashService` (scrypt, ADR 0007), with a decoy hash for unknown emails.
- `access-token.service.ts`: `AccessTokenService` (HS256 JWT carrying `sub` and `sid`) and `AccessClaims`.
- `session-issuer.service.ts`: `SessionIssuerService` (starts a Session and issues both credentials, ADR 0001), plus the secret helpers `mintSecret`, `hashSecret`, `secretMatches` (constant-time).
- `access-token.guard.ts`: `AccessTokenGuard` and `AuthenticatedRequest`.
- `session.rules.ts`: `isSessionLive`, `isWithinGrace`, `slidIdleExpiry`.
- `auth.types.ts`: `signUpSchema`, `signInSchema`, `SignUpBody`, `SignInBody`; every check's error is its rule id.
- `handlers/`: `SignUpHandler` (also exports `SignedIn`), `SignInHandler`, `RefreshHandler`.
