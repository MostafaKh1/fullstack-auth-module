# frontend/AGENTS.md

React 19 + Vite + TypeScript single-page app. Architecture and its reasons: [ADR 0006](../docs/adr/0006-front-end-architecture.md); the rules a reviewer holds: [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: front end").

## Layers

Imports point down this table only. A layer may skip the ones between (a page may import `utils/`), never point up.

| Layer      | Folder            | Owns                                                                                   | Doc                                                  |
| ---------- | ----------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| App        | `src/app/`        | the providers around the router, the one route table, the query client                 | [src/app/AGENTS.md](src/app/AGENTS.md)               |
| Pages      | `src/pages/`      | one screen per route, composing components                                             | [src/pages/AGENTS.md](src/pages/AGENTS.md)           |
| Components | `src/components/` | every component that is not a page: `base/`, `composite/`, `layout/`, `utility/`       | [src/components/AGENTS.md](src/components/AGENTS.md) |
| Hooks      | `src/hooks/`      | hooks over server state and over the Session context                                   | [src/hooks/AGENTS.md](src/hooks/AGENTS.md)           |
| Providers  | `src/providers/`  | React context providers mounted once in `App` (the Session)                            | [src/providers/AGENTS.md](src/providers/AGENTS.md)   |
| Utils      | `src/utils/`      | framework-free modules: the HTTP client, one module per API resource, `cn()`, the copy | [src/utils/AGENTS.md](src/utils/AGENTS.md)           |

`src/tests/` is the rendered-app harness and sits outside the stack: [src/tests/AGENTS.md](src/tests/AGENTS.md). `src/main.tsx` is the browser entry: it builds the browser router from `routes` and the query client, and renders `App`.

## Naming and exports

The case of a file name says what it holds:

- **PascalCase** for a component, layout, page or provider; the file is named after the one component it exports: `Button.tsx` exports `Button`, `SessionProvider.tsx` exports `SessionProvider`.
- **`useX.ts`** for a hook: `useSession.ts` exports `useSession`.
- **kebab-case** for everything else (utilities, contexts, helpers, test support): `api-client.ts`, `session-context.ts`, `render-app.tsx`. Folders are kebab-case too, except a component folder, which takes its entry component's name.
- **A component that grows children becomes a folder** named after it, holding the entry file of the same name and children that share its prefix: `AuthScreen/AuthScreen.tsx`, `AuthScreen/AuthScreenSignInForm.tsx`. A non-component helper inside such a folder is kebab-case with the same prefix (`auth-screen-api-failure.ts`). Children import each other relatively; the outside world imports the entry, or the child it needs, by its own path.
- One public component or hook per file, as a named export; no default exports and no `index.ts` barrels.
- Props are `type Props = { ... }`; a styleable root takes `className` and merges it through `cn()`.
- `.tsx` for files with JSX, `.ts` otherwise. A test sits beside the file it covers as `<File>.test.tsx`.
- Domain names come from [GLOSSARY.md](../GLOSSARY.md): `signIn`, never `login`.

## State

- **Server state** goes through TanStack Query: a page or hook calls `useQuery` / `useMutation` over a function from `src/utils/`. Query keys are arrays led by the resource (`["users", "me"]`).
- **Client state** is the Session context only (restoring, signed in, signed out); the access token lives only in `src/utils/api-client.ts`'s memory ([ADR 0008](../docs/adr/0008-front-end-session-handling.md)). Anything else is local `useState` or form state.

## Copy and errors

Every sentence a User reads is written in the front end ([ADR 0002](../docs/adr/0002-api-errors-carry-codes-not-copy.md)):

- A failed request rejects with the envelope; the caller reads its `code`, never its `message`.
- `code` becomes a sentence through the one copy map, `errorCopy()` in `src/utils/error-copy.ts`, with a generic fallback for an unknown code; a failure with no envelope (no response, or a proxy's page) reads as `unreachableCopy`.
- Each `issues` entry (`{ path, code }`) is set on its form field with React Hook Form's `setError`, and its rule id becomes the field's sentence through the same map; a taken email goes on the email field, anything else is a form-level alert (`applyApiFailure` in `auth-screen-api-failure.ts`). A field error holds the code; the form renders `errorCopy(code)`.
- Copy that is not an error (headings, labels) sits in the page or component that shows it, as `SignInPage.tsx` does.

## Commands

Run from `frontend/`: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`. Lint and format run from the repository root. `.env.example` lists every variable the app reads (`API_PROXY_TARGET`, used only by the dev proxy).

## Gotchas

- Rollup is overridden with `@rollup/wasm-node` in `package.json`: the development machine blocks unsigned native addons, so a dependency that ships a native `.node` binary cannot be added.
- Field lengths are counted in code points (`[...value].length`), as the back end counts them, never with UTF-16 `.length`.
- An `<input>` strips line breaks from its value, so a worked example containing one cannot reach the rules from a form; its test asserts that instead.
