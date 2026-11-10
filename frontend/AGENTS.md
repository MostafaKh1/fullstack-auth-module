# frontend/AGENTS.md

React 19 + Vite + TypeScript single-page app. Architecture: [ADR 0006](../docs/adr/0006-front-end-architecture.md). Rules a reviewer holds: [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: front end").

## Where things are

- `src/main.tsx`: browser entry; builds the browser router and the query client.
- `src/app/`: `app.tsx` (providers around the router), `routes.tsx` (the one route table), `query-client.ts`.
- `src/pages/`: one page per route.
- `src/components/`: shared components; variants with CVA, classes through `cn()` from `src/lib/cn.ts`.
- `src/api/`: one function per endpoint over the single client in `client.ts` (base URL `/api`).
- `src/test/`: the rendered-app harness: `render-app.tsx`, the MSW `server.ts`, and `setup.ts`.
- `.env.example`: every variable the app reads (`API_PROXY_TARGET`, used only by the dev proxy in `vite.config.ts`).

## Commands

Run from `frontend/`: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`. Lint and format run from the repository root.

## Tests

- Tests sit next to the page they exercise as `*.test.tsx` and go through `renderApp(path, { handlers })` only: the whole app, real router, MSW for the network.
- Declare every request a test makes in `handlers`; an undeclared request fails the test after it ends.
- Query by role and visible text, as a User would.

## Gotchas

- Rollup is overridden with `@rollup/wasm-node` in `package.json`: unsigned native addons are blocked on the development machine. Do not add a dependency that ships a native `.node` binary.
