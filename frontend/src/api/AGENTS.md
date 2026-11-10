# frontend/src/api/AGENTS.md

The front end's side of the API contract (the "API contract" table in `docs/spec/auth-module.md`): one HTTP client and one function per endpoint. Nothing else in the app imports axios.

## Where does this file belong?

1. A call to a new endpoint -> a function in `<resource>.ts` here (`auth.ts` for `/auth/*`, `users.ts` for `/users/*`), next to the request and response types it uses.
2. Attaching the access token, or refreshing on `401 auth.unauthenticated` -> `client.ts`, once, as interceptors; never in a caller.
3. Turning an error `code` into a sentence -> not here: the copy map in `src/lib/` (see "Copy and errors" in [frontend/AGENTS.md](../../AGENTS.md)).
4. Caching, loading and retry state -> TanStack Query in the page or feature that calls the function.

## Conventions

- A function is named verb-first for what it does (`getCurrentUser`, `signUp`), takes plain arguments, and returns `response.data`; a failure rejects, and the caller reads the envelope's `code`.
- Paths are relative to the client's `/api` base URL: `"/users/me"`, not `"/api/users/me"`.
- Types mirror the contract's shapes by hand (`User`); the apps share no code.
- Canonical example: `users.ts`.

## Inventory

- `client.ts`: `apiClient`, axios with `baseURL: "/api"` and `withCredentials` so the refresh cookie travels; `setAccessToken()`, the in-memory access token it attaches as `Bearer` (ADR 0008).
- `api-error.ts`: `ApiErrorEnvelope`, `ValidationIssue`, and `apiErrorEnvelope(error)`, which returns the envelope or `null` when none arrived.
- `auth.ts`: `signUp()`, `signIn()`, `refreshSession()`, and `SignedIn` (`{ accessToken, expiresIn, user }`).
- `session-refresh.ts`: `refreshSessionOnce()`, one refresh shared by every caller while in flight, and the response interceptor that answers a `401 auth.unauthenticated` with it and sends the request again once (never for `/auth/*`). The outcome reaches the Session context through the `SessionListener` it registers with `listenForSessionChanges()`, so the context stays the only writer of the token.
- `users.ts`: `getCurrentUser()` (`GET /users/me`) and `User`.
