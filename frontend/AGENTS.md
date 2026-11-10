# frontend/AGENTS.md

React 19 + Vite + TypeScript single-page app. Architecture and its reasons: [ADR 0006](../docs/adr/0006-front-end-architecture.md); the rules a reviewer holds: [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: front end").

## Layers

Imports point down this list only: `app` -> `pages` -> `features` -> `components` and `api` -> `lib`. A page may also call `api` and `components` directly; `components` import only `lib`, so they stay free of data and the network.

| Layer      | Folder            | Owns                                                                                          | Doc                                                  |
| ---------- | ----------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Routes     | `src/app/`        | the providers (`app.tsx`), the one route table (`routes.tsx`), the query client               | below                                                |
| Pages      | `src/pages/`      | one screen per route, composing features and components                                       | [src/pages/AGENTS.md](src/pages/AGENTS.md)           |
| Features   | `src/features/`   | one capability's forms, Zod schemas, hooks and context (the Session context lives in `auth/`) | [src/features/AGENTS.md](src/features/AGENTS.md)     |
| Components | `src/components/` | shared presentational UI with CVA variants; no data, no copy of its own                       | [src/components/AGENTS.md](src/components/AGENTS.md) |
| API client | `src/api/`        | the one HTTP client and one function per endpoint                                             | [src/api/AGENTS.md](src/api/AGENTS.md)               |
| Lib        | `src/lib/`        | framework-free helpers any layer may import: `cn()`, and the error copy map once it exists    | below                                                |

`src/test/` is the rendered-app harness and sits outside the stack: [src/test/AGENTS.md](src/test/AGENTS.md). `src/main.tsx` is the browser entry: it builds the browser router from `routes` and the query client, and renders `App`.

## State

- **Server state** goes through TanStack Query: a page or feature hook calls `useQuery` / `useMutation` over a function from `src/api/`. Query keys are arrays led by the resource (`["health"]`).
- **Client state** is the Session context only (restoring, signed in, signed out), with the access token in memory. Anything else is local `useState` or form state.

## Copy and errors

Every sentence a User reads is written in the front end ([ADR 0002](../docs/adr/0002-api-errors-carry-codes-not-copy.md)):

- A failed request rejects with the envelope; the caller reads its `code`, never its `message`.
- `code` becomes a sentence through the one copy map, with a generic fallback for an unknown code.
- Each `issues` entry (`{ path, code }`) is set on its form field with React Hook Form's `setError`, and its rule id becomes the field's sentence through the same map; a taken email goes on the email field, anything else is a form-level alert.
- Copy that is not an error (headings, labels) sits in the component or page that shows it, as `placeholder-page.tsx` does.

## Naming and exports

- Files and folders are kebab-case: `status-badge.tsx` exports `StatusBadge`, `not-found-page.tsx` exports `NotFoundPage`, a hook file `use-session.ts` would export `useSession`.
- Named exports only, one public component or hook per file; no default exports and no `index.ts` barrels.
- Props are `type Props = { ... }`; a styleable root takes `className` and merges it through `cn()`.
- `.tsx` for files with JSX, `.ts` otherwise. Domain names come from [GLOSSARY.md](../GLOSSARY.md): `signIn`, never `login`.

## `src/app/` and `src/lib/`

- `routes.tsx` is the only route table; the browser and the test harness both read it, so a new route is added there and nowhere else. A route guard wraps elements here.
- `app.tsx` holds every provider; a new provider (the Session context) is mounted here so tests get it too.
- `query-client.ts`: `createQueryClient({ retry })`; tests pass `retry: false`.
- `lib/cn.ts`: `cn()`, `clsx` then `tailwind-merge`.

## Commands

Run from `frontend/`: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`. Lint and format run from the repository root. `.env.example` lists every variable the app reads (`API_PROXY_TARGET`, used only by the dev proxy).

## Gotchas

- Rollup is overridden with `@rollup/wasm-node` in `package.json`: the development machine blocks unsigned native addons, so a dependency that ships a native `.node` binary cannot be added.
