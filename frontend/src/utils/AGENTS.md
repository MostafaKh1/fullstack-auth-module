# frontend/src/utils/AGENTS.md

Framework-free modules any layer may import: the front end's side of the API contract (the "API contract" table in `docs/spec/auth-module.md`), `cn()`, and the error copy. Nothing outside this folder imports axios; nothing here imports React or another app folder.

## Where does this file belong?

1. A call to a new endpoint -> a function in `<resource>-api.ts` here (`auth-api.ts` for `/auth/*`, `users-api.ts` for `/users/*`), next to the request and response types it uses.
2. Attaching the access token, or refreshing on `401 auth.unauthenticated` -> `api-client.ts` and `session-refresh.ts`, once, as interceptors; never in a caller.
3. An error sentence -> `error-copy.ts`, keyed by API code or rule id.
4. Caching, loading and retry state -> TanStack Query in a hook or page, not here.
5. Any other pure helper two layers need -> a kebab-case `<name>.ts` here.

## Conventions

- Files are kebab-case, named for what they hold; no barrels, named exports only.
- An API function is named verb-first for what it does (`getCurrentUser`, `signUp`), takes plain arguments, and returns `response.data`; a failure rejects, and the caller reads the envelope's `code`.
- Paths are relative to the client's `/api` base URL: `"/users/me"`, not `"/api/users/me"`.
- Types mirror the contract's shapes by hand (`User`); the apps share no code.
- Canonical example: `users-api.ts`.

## Inventory

- `api-client.ts`: `apiClient`, axios with `baseURL: "/api"` and `withCredentials` so the refresh cookie travels; `setAccessToken()`, the in-memory access token it attaches as `Bearer` (ADR 0008).
- `api-error.ts`: `ApiErrorEnvelope`, `ValidationIssue`, and `apiErrorEnvelope(error)`, which returns the envelope or `null` when none arrived.
- `auth-api.ts`: `signUp()`, `signIn()`, `refreshSession()`, and `SignedIn` (`{ accessToken, expiresIn, user }`).
- `users-api.ts`: `getCurrentUser()` (`GET /users/me`) and `User`.
- `session-refresh.ts`: `refreshSessionOnce()`, one refresh shared by every caller while in flight, and the response interceptor that answers a `401 auth.unauthenticated` with it and sends the request again once (never for `/auth/*`). The outcome reaches the Session context through the `SessionListener` it registers with `listenForSessionChanges()`, so the context stays the only writer of the token.
- `cn.ts`: `cn()`, `clsx` then `tailwind-merge`.
- `error-copy.ts`: `errorCopy(code)`, `fallbackCopy`, `unreachableCopy`; every error sentence.
