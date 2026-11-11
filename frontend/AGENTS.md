# frontend/AGENTS.md

React 19 + Vite + TypeScript single-page app. Architecture and its reasons: [ADR 0006](../docs/adr/0006-front-end-architecture.md); the rules a reviewer holds: [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: front end").

## Layers

Imports point down this table only. A layer may skip the ones between (a page may import `utils/`), never point up.

| Layer      | Folder            | Owns                                                                                   |
| ---------- | ----------------- | -------------------------------------------------------------------------------------- |
| App        | `src/app/`        | the providers around the router (`App.tsx`), the one route table, the query client     |
| Pages      | `src/pages/`      | one screen per route, composing components                                             |
| Components | `src/components/` | every component that is not a page: `layout/`, `composite/`, `base/`, `utility/`       |
| Hooks      | `src/hooks/`      | hooks more than one component or page uses: over server state and over a context       |
| Providers  | `src/providers/`  | React context providers mounted once in `App` (the Session)                            |
| Utils      | `src/utils/`      | framework-free modules: the HTTP client, one module per API resource, `cn()`, the copy |

`src/tests/` is the rendered-app harness and sits outside the stack (see "Tests"). `src/main.tsx` is the browser entry; it and the harness build the app from the same `src/app/` files, so tests run the real providers and routes.

## Where does this file belong?

The first match wins:

1. A new screen at a URL -> `src/pages/<group>/<route>/<Name>Page.tsx`, plus its entry in `src/app/routes.tsx` (the only place a route is added; a route guard wraps elements there). A parenthesised group (`(auth)`, `(webapp)`) groups screens by who sees them and adds nothing to the URL; the route folder is named for the path or, for Sign in and Sign up (both at `/`), for their `auth` value ([ADR 0009](../docs/adr/0009-auth-forms-addressed-by-search-parameter.md)). A protected screen goes inside `RequireSession`.
2. A route guard, a switch that picks a page by URL, or other chrome around pages -> `src/components/layout/<group>/`. Pages arrive as props, so `layout/` never imports `pages/`.
3. A loading state, fallback or other small cross-cutting piece with no design-system role -> `src/components/utility/`; it imports only `src/utils/`.
4. A single-purpose control driven only by props (a button, an input) -> `src/components/base/<kind>/`; it imports `src/utils/cn.ts` and its own libraries, nothing else in the app.
5. Anything built from base components, or that knows about the Session, a form schema or an endpoint -> `src/components/composite/`, either as a component folder (`AuthScreen/`) or in a kind group (`banners-and-notifications/`). UI one page alone uses still goes in `src/components/`: pages hold no components of their own.
6. A hook more than one component uses -> `src/hooks/useX.ts`; a hook one component uses stays in its file.
7. An app-wide context -> `src/providers/<Name>Provider.tsx`, its context and types in `<name>-context.ts` beside it (so a hook can import the context without the provider), mounted in `src/app/App.tsx` inside the query client.
8. A call to an endpoint -> a function in `src/utils/<resource>-api.ts` (`auth-api.ts` for `/auth/*`, `users-api.ts` for `/users/*`), next to the request and response types it uses. Any other pure helper two layers need -> a kebab-case module in `src/utils/`.

Kind folders inside a section are kebab-case and plural (`buttons/`, `inputs/`, `route-guards/`, `route-switches/`).

## Naming and exports

The case of a file name says what it holds:

- **PascalCase** for a component, layout, page or provider; the file is named after the one component it exports: `Button.tsx` exports `Button`, `SessionProvider.tsx` exports `SessionProvider`.
- **`useX.ts`** for a hook: `useSession.ts` exports `useSession`.
- **kebab-case** for everything else (utilities, contexts, helpers, test support): `api-client.ts`, `session-context.ts`, `render-app.tsx`. Folders are kebab-case too, except a component folder, which takes its entry component's name.
- **A component that grows children becomes a folder** named after it, holding the entry file of the same name and children that share its prefix: `AuthScreen/AuthScreen.tsx`, `AuthScreen/AuthScreenSignInForm.tsx`. A non-component helper inside such a folder is kebab-case with the same prefix (`auth-screen-api-failure.ts`). Children import each other relatively; the outside world imports the entry, or the child it needs, by its own path.
- One public component or hook per file, as a named export; no default exports and no `index.ts` barrels.
- Props are `type Props = { ... }`; a styleable root takes `className` and merges it through `cn()`. Variants are a `cva(...)` above the component, `Props` is `VariantProps<typeof x> & { className?: string; ... }`, and the root's classes are `cn(x({ ...variants }), className)`.
- Use the native element with the right role (`<button>`, `<p role="status">`) so tests and assistive tech find it by role.
- `.tsx` for files with JSX, `.ts` otherwise. A test sits beside the file it covers as `<File>.test.tsx`.
- Domain names come from [GLOSSARY.md](../GLOSSARY.md): `signIn`, never `login`.

## Pages

A page renders one `<main>` with one `<h1>` (tests find the screen by that heading) and a `<title>` naming the screen. It owns the screen's layout and its non-error copy, reads server data through a hook or TanStack Query over `src/utils/`, and is the only thing the route table imports. Canonical example: `src/pages/(auth)/sign-in/SignInPage.tsx` with its test.

## State

- **Server state** goes through TanStack Query: a page or hook calls `useQuery` / `useMutation` over one function from `src/utils/`. Query keys are arrays led by the resource (`["users", "me"]`).
- **Client state** is the Session context only (restoring, signed in, signed out) ([ADR 0008](../docs/adr/0008-front-end-session-handling.md)). A component reads it through `useSession()`, never `use(SessionContext)`; a context hook throws when its provider is missing. Anything else is local `useState` or form state.
- The access token lives only in `src/utils/api-client.ts`'s memory, and `SessionProvider` is its only writer. Attaching it, and refreshing once on a `401 auth.unauthenticated` (never for `/auth/*`), happen once as interceptors in `api-client.ts` and `session-refresh.ts`, never in a caller; the refresh outcome reaches the context through the listener it registers.

## The API side

- Nothing outside `src/utils/` imports axios; nothing in `src/utils/` imports React or another app folder.
- An API function is named verb-first (`getCurrentUser`, `signUp`), takes plain arguments and returns `response.data`; a failure rejects with the envelope. Paths are relative to the client's `/api` base URL (`"/users/me"`).
- Types mirror the contract's shapes by hand (the "API contract" table in `docs/spec/auth-module.md`); the apps share no code.
- The `returnTo` safety rule has one implementation, `isSafeReturnTo()` in `src/utils/return-to.ts`, and one table of worked examples beside it that the page tests run; a new unsafe form is a new row.

## Copy and errors

Every sentence a User reads is written in the front end ([ADR 0002](../docs/adr/0002-api-errors-carry-codes-not-copy.md)):

- A failed request rejects with the envelope; the caller reads its `code`, never its `message`.
- `code` becomes a sentence through the one copy map, `errorCopy()` in `src/utils/error-copy.ts`, with a generic fallback for an unknown code; a failure with no envelope (no response, or a proxy's page) reads as `unreachableCopy`.
- Each `issues` entry (`{ path, code }`) is set on its form field with React Hook Form's `setError`, and its rule id becomes the field's sentence through the same map; a taken email goes on the email field, anything else is a form-level alert (`applyApiFailure` in `auth-screen-api-failure.ts`). A field error holds the code; the form renders `errorCopy(code)`.
- Copy that is not an error (headings, labels) sits in the page or component that shows it, as `SignInPage.tsx` does.
- The field rules are `src/components/composite/AuthScreen/AuthScreenFieldRules.ts`, the front end's copy; the back end's is `backend/src/features/auth/auth.types.ts`. Change both, and both worked-examples tables (`AuthScreenFieldRules.examples.ts` here), in the same commit.

## Tests

The only seam is the whole rendered app with its real router and providers, the network faked by MSW ([ADR 0004](../docs/adr/0004-quality-gates-and-test-seams.md)).

- A test of a screen or a journey -> `<Name>Page.test.tsx` beside the page; of a component, beside that component. `src/tests/setup/` is what Vitest runs before every file; a helper several tests share (a fixture, a handler factory, a form helper) -> a kebab-case file in `src/tests/support/`; a test of the harness sits beside the helper it pins.
- `await renderApp(path, { handlers })` renders the app as if the browser opened `path`, waits for the boot restore to settle and a page to show, and returns Testing Library's view plus `router` and a `user` from `user-event`. `renderRestoringApp` returns at once, for the loading state.
- The boot restore's `POST /api/auth/refresh` answers "no Session" unless `handlers` declares its own. Declare every request a test makes; an undeclared request fails the test with `Undeclared request: <METHOD> <path>`.
- Query by role and visible text, as a User would; await what appears after a request with `findBy*`. Expected sentences come from `src/tests/support/expected-copy.ts`, written apart from the app's copy map.
- Canonical example: `src/pages/(auth)/sign-in/SignInPage.test.tsx`.

## Commands

Run from `frontend/`: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`. Lint and format run from the repository root. `.env.example` lists every variable the app reads (`API_PROXY_TARGET`, used only by the dev proxy).

## Gotchas

- Rollup is overridden with `@rollup/wasm-node` in `package.json`: the development machine blocks unsigned native addons, so a dependency that ships a native `.node` binary cannot be added.
- Field lengths are counted in code points (`[...value].length`), as the back end counts them, never with UTF-16 `.length`.
- An `<input>` strips line breaks from its value, so a worked example containing one cannot reach the rules from a form; its test asserts that instead.
- Tests pass `retry: false` to `createQueryClient`, so a failed query shows at once.
