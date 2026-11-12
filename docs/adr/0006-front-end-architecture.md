# Front end: React and Vite, TanStack Query, React Hook Form with Zod, Tailwind with CVA, and all copy in the front end

**Amended:** shared code is organised by role and a feature's code by feature. What one feature owns (its screens, route guards, Session state, URL helpers) lives in `src/features/<name>/`, which repeats the shared kind folders (`components/`, `hooks/`, `providers/`, `utils/`) under the same naming rules; what several features or the app shell use stays in the shared folders below. A feature imports from the shared folders and itself, never from another feature; the shared folders import no feature; `app/` and `pages/` may import features. The structure check enforces it. Every call goes through the one oRPC client built from the contract ([ADR 0012](0012-shared-orpc-contract-in-an-npm-workspace.md)), not one module per resource. This keeps a feature added, changed or deleted in one folder instead of across six.

The front end is a React 19 single-page app built with Vite and TypeScript, routed by React Router.
Server state goes through TanStack Query, and the only client state is the Session context; components call one function per endpoint in `src/utils/api/<resource>-api.ts`, never the HTTP client directly.
Forms use React Hook Form with Zod schemas as resolvers, so the field rules are one declarative schema per form that also drives the live password checklist.
Styling is Tailwind 4; a component's variants are declared with CVA, and every class list goes through one `cn()` helper (`clsx` then `tailwind-merge`), so a caller's `className` overrides a component's own classes deterministically. The building blocks themselves come from shadcn/ui on Radix ([ADR 0011](0011-shadcn-ui-on-radix-for-building-blocks.md)).
Every sentence a User reads lives in the front end, looked up by error code or rule id with a generic fallback ([ADR 0002](0002-api-errors-carry-codes-not-copy.md)); the server's `message` is never shown.

In development Vite proxies `/api` to the back end (`API_PROXY_TARGET`), so the browser sees one origin, as it does behind a reverse proxy in production: the refresh cookie and the `Origin` check behave the same in both.
Rollup, which Vite builds with, runs as its WebAssembly build (`@rollup/wasm-node`, an npm override) because the development machine blocks unsigned native addons.

## Considered options

- **Vue.** The brief allows either; React was chosen for its ecosystem around the pieces above (TanStack Query, React Hook Form, Testing Library) and for familiarity, not for a capability Vue lacks.
- **Next.js or another server-rendering framework.** It would put a second server between the browser and the API for a three-page app with nothing to render on the server, and would blur which app owns the cookie.
- **Server state in a global store or `useEffect` fetching.** Caching, deduplication, retries and loading states would be hand-written; TanStack Query provides them.
- **Controlled forms or Formik.** Re-render per keystroke, or a heavier API without first-class Zod resolvers.
- **A component library (MUI, Chakra).** Faster to a first screen, but its theming fights Tailwind and its bundle is large for three forms; CVA gives typed variants with plain classes. shadcn/ui avoids both costs: its source is copied in, styled with Tailwind and CVA (ADR 0011).
- **Error copy from the server.** Rejected in ADR 0002: copy would be split across two codebases and the UI would break when wording changed.

## Consequences

- Shared files are organised by role, and a feature's files by feature in `src/features/<name>/`: `src/app/`, `src/pages/` (one folder per route), `src/components/` (five sections, in the order a component is placed: `primitives/`, `base/`, `composite/`, `layout/`, `utility/`; a component with children is a folder of its name, such as `composite/screens/AuthScreen/`), `src/hooks/`, `src/providers/`, `src/utils/`. A component file is PascalCase and named for its one export, so a component is found by name alone.
- A new error code or rule id needs an entry in the front end's copy map in the same change as the back end's closed set.
- Front-end tests render the whole app at a path with MSW faking the network ([ADR 0004](0004-quality-gates-and-test-seams.md)); a request a test did not declare fails it.
