# frontend/src/tests/AGENTS.md

The rendered-app harness: the front end's only test seam, the whole app with its real router and providers, the network faked by MSW ([ADR 0004](../../../docs/adr/0004-quality-gates-and-test-seams.md)). The test rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Tests").

## Where does this file belong?

1. A test of a screen or a journey across screens -> `<Name>Page.test.tsx` beside the page in `src/pages/`; a test of a component, beside that component. Not here.
2. Something Vitest runs before every test file -> `setup/` (`vitest.config.ts` names `setup/setup.ts`).
3. A helper several tests share (a fixture, a handler factory, a form helper) -> a kebab-case file in `support/`.
4. A test of the harness itself -> beside the helper it pins, as `support/render-app.test.tsx` is.

## Writing a test

- `await renderApp(path, { handlers })` renders the app as if the browser opened `path`, waits for the boot restore to settle and a page to show, and returns Testing Library's view plus `router` and a `user` from `user-event`. `renderRestoringApp` returns at once, for tests of the loading state.
- The boot restore's `POST /api/auth/refresh` answers "no Session" (`noSessionToRestore`) unless `handlers` declares its own.
- Declare every request the test makes as an MSW handler in `handlers`; an undeclared request fails the test after it ends, with `Undeclared request: <METHOD> <path>`.
- Query by role and visible text, as a User would; await what appears after a request with `findBy*`.
- Canonical example: `src/pages/(auth)/sign-in/SignInPage.test.tsx`.

## Inventory

- `setup/setup.ts`: Vitest's setup file: starts the server, and after each test cleans up, resets handlers and fails on undeclared requests.
- `setup/server.ts`: the MSW `server`, and the undeclared-request check (`listenForDeclaredRequestsOnly`, `failOnUndeclaredRequests`).
- `support/render-app.tsx`: `renderApp`, `renderRestoringApp`; `support/render-app.test.tsx` pins the undeclared-request failure and the not-found page.
- `support/auth-fixtures.ts`: Ada (a User and her password), `envelope()` for error responses, handlers for a successful Sign up / Sign in and for `/users/me` (which answers only Ada's access token), `heldUntilReleased()` to observe a request in flight, `noSessionToRestore`, `refreshAnswersAda(...tokens)` (counts its calls) and `refreshedAccessToken`.
- `support/expected-copy.ts`: the sentences tests expect, written out apart from the app's copy map.
- `support/fill-form.ts`: `enterField()` (focus, paste, leave) and `fillForm()`.
