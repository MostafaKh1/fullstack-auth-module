# frontend/src/test/AGENTS.md

The rendered-app harness: the front end's only test seam, the whole app with its real router and providers, the network faked by MSW ([ADR 0004](../../../docs/adr/0004-quality-gates-and-test-seams.md)). The test rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Tests").

## Where does this file belong?

1. A test of a screen or a journey across screens -> `<name>-page.test.tsx` beside the page in `src/pages/`, not here.
2. A helper several tests share (a fixture, a handler factory for an endpoint) -> a `.ts` file here.
3. A test of the harness itself -> here, as `render-app.test.tsx` is.

## Writing a test

- `renderApp(path, { handlers })` renders the app as if the browser opened `path`, and returns Testing Library's view plus `router` and a `user` from `user-event`.
- Declare every request the test makes as an MSW handler in `handlers`; an undeclared request fails the test after it ends, with `Undeclared request: <METHOD> <path>`.
- Query by role and visible text, as a User would; await what appears after a request with `findBy*`.
- Canonical example: `src/pages/placeholder-page.test.tsx`.

## Inventory

- `render-app.tsx`: `renderApp`.
- `server.ts`: the MSW `server`, and the undeclared-request check (`listenForDeclaredRequestsOnly`, `failOnUndeclaredRequests`).
- `setup.ts`: Vitest's setup file (in `vitest.config.ts`): starts the server, and after each test cleans up, resets handlers and fails on undeclared requests.
- `render-app.test.tsx`: pins the undeclared-request failure.
