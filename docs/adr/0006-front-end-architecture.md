# Front end: React and Vite, TanStack Query, React Hook Form with Zod, Tailwind with CVA, and all copy in the front end

The front end is a React 19 single-page app built with Vite and TypeScript, routed by React Router.
Server state goes through TanStack Query, and the only client state is the Session context; components call one function per endpoint in `src/api/`, never the HTTP client directly.
Forms use React Hook Form with Zod schemas as resolvers, so the field rules are one declarative schema per form that also drives the live password checklist.
Styling is Tailwind 4; a component's variants are declared with CVA, and every class list goes through one `cn()` helper (`clsx` then `tailwind-merge`), so a caller's `className` overrides a component's own classes deterministically.
Every sentence a User reads lives in the front end, looked up by error code or rule id with a generic fallback ([ADR 0002](0002-api-errors-carry-codes-not-copy.md)); the server's `message` is never shown.

In development Vite proxies `/api` to the back end (`API_PROXY_TARGET`), so the browser sees one origin, as it does behind a reverse proxy in production: the refresh cookie and the `Origin` check behave the same in both.
Rollup, which Vite builds with, runs as its WebAssembly build (`@rollup/wasm-node`, an npm override) because the development machine blocks unsigned native addons.

## Considered options

- **Vue.** The brief allows either; React was chosen for its ecosystem around the pieces above (TanStack Query, React Hook Form, Testing Library) and for familiarity, not for a capability Vue lacks.
- **Next.js or another server-rendering framework.** It would put a second server between the browser and the API for a three-page app with nothing to render on the server, and would blur which app owns the cookie.
- **Server state in a global store or `useEffect` fetching.** Caching, deduplication, retries and loading states would be hand-written; TanStack Query provides them.
- **Controlled forms or Formik.** Re-render per keystroke, or a heavier API without first-class Zod resolvers.
- **A component library (MUI, Chakra).** Faster to a first screen, but its theming fights Tailwind and its bundle is large for three forms; CVA gives typed variants with plain classes.
- **Error copy from the server.** Rejected in ADR 0002: copy would be split across two codebases and the UI would break when wording changed.

## Consequences

- A new error code or rule id needs an entry in the front end's copy map in the same change as the back end's closed set.
- Front-end tests render the whole app at a path with MSW faking the network ([ADR 0004](0004-quality-gates-and-test-seams.md)); a request a test did not declare fails it.
