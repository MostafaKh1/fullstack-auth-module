# frontend/src/pages/AGENTS.md

One screen per route. A page composes features and components, owns the screen's layout and its non-error copy, and is the only thing the route table imports.

## Where does this file belong?

1. A new screen at a URL -> `<name>-page.tsx` here exporting `<Name>Page`, plus its entry in `src/app/routes.tsx`. The spec's screens are Sign up, Sign in and the Application page.
2. A form, a hook or state the screen uses -> its feature in `src/features/`, not here.
3. A piece of UI a second page also needs -> `src/components/`.
4. The test for the screen -> `<name>-page.test.tsx` beside it, through `renderApp` ([src/test/AGENTS.md](../test/AGENTS.md)).

## Conventions

- A page renders one `<main>` with one `<h1>`; tests find the screen by that heading.
- Named export (the router takes elements, so no page needs a default export).
- A page reads server data through TanStack Query over `src/api/`, or through a feature hook once one owns that data.
- Canonical example: `sign-in-page.tsx` with `sign-in-page.test.tsx`.

## Inventory

- `application-page.tsx`: `/`, the Application page (behind `RequireSession`): "Welcome to the application." and "Signed in as {name}" from `GET /api/users/me`.
- `sign-in-page.tsx`: `/sign-in`, and `sign-up-page.tsx`: `/sign-up` (behind `RequireSignedOut`).
- `not-found-page.tsx`: every path with no route.
