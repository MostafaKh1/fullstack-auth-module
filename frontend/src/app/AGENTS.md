# frontend/src/app/AGENTS.md

The top of the stack: what wraps every page, and which page answers which URL. The browser (`src/main.tsx`) and the test harness (`src/tests/support/render-app.tsx`) both build the app from these three files, so tests run the same providers and routes.

## Conventions

- `App.tsx` is PascalCase (a component); the other two are kebab-case modules.
- A new route is added to `routes.tsx` and nowhere else; a route guard wraps elements there.
- A new app-wide provider is mounted in `App.tsx`, inside the query client; its code lives in `src/providers/`.

## Inventory

- `App.tsx`: `App({ router, queryClient })`, the providers (the query client, then `SessionProvider`) around the router.
- `routes.tsx`: `routes`, the one route table ([ADR 0009](../../../docs/adr/0009-auth-forms-addressed-by-search-parameter.md)): `/` is `AuthFormSwitch`, which shows Sign in (`?auth=sign-in`, or any unknown value) or Sign up (`?auth=sign-up`) inside `RequireSignedOut`, and, without `auth`, the Application page inside `RequireSession`; the old `/sign-in` and `/sign-up` are `AuthPathRedirect`s; `*` is the not-found page.
- `query-client.ts`: `createQueryClient({ retry })`; tests pass `retry: false`.
