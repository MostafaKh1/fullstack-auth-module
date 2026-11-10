# frontend/src/api/AGENTS.md

The front end's side of the API contract (the "API contract" table in `docs/spec/auth-module.md`): one HTTP client and one function per endpoint. Nothing else in the app imports axios.

## Where does this file belong?

1. A call to a new endpoint -> a function in `<resource>.ts` here (`health.ts`; `auth.ts` for `/auth/*`, `users.ts` for `/users/*`), next to the request and response types it uses.
2. Attaching the access token, or refreshing on `401 auth.unauthenticated` -> `client.ts`, once, as interceptors; never in a caller.
3. Turning an error `code` into a sentence -> not here: the copy map in `src/lib/` (see "Copy and errors" in [frontend/AGENTS.md](../../AGENTS.md)).
4. Caching, loading and retry state -> TanStack Query in the page or feature that calls the function.

## Conventions

- A function is named verb-first for what it does (`getHealth`, `signUp`), takes plain arguments, and returns `response.data`; a failure rejects, and the caller reads the envelope's `code`.
- Paths are relative to the client's `/api` base URL: `"/health"`, not `"/api/health"`.
- Types mirror the contract's shapes by hand (`Health`); the apps share no code.
- Canonical example: `health.ts`.

## Inventory

- `client.ts`: `apiClient`, axios with `baseURL: "/api"` and `withCredentials` so the refresh cookie travels.
- `health.ts`: `getHealth()` and `Health`.
