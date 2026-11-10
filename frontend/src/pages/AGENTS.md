# frontend/src/pages/AGENTS.md

One screen per route. A page composes components, owns the screen's layout and its non-error copy, and is the only thing the route table imports.

## Layout

```
pages/
├── (auth)/           # screens for a signed-out visitor
│   ├── sign-in/SignInPage.tsx (+ SignInPage.test.tsx)
│   └── sign-up/SignUpPage.tsx (+ SignUpPage.test.tsx)
├── (webapp)/         # screens behind RequireSession
│   └── application/ApplicationPage.tsx (+ ApplicationPage.test.tsx)
└── not-found/NotFoundPage.tsx
```

A parenthesised folder groups screens by who sees them and adds nothing to the URL; a kebab-case folder is named for the route's path.

## Where does this file belong?

1. A new screen at a URL -> `<group>/<route>/<Name>Page.tsx` exporting `<Name>Page`, plus its entry in `src/app/routes.tsx`. The spec's screens are Sign up, Sign in and the Application page.
2. A form, a frame or any UI the screen renders -> `src/components/` ([src/components/AGENTS.md](../components/AGENTS.md)); a hook -> `src/hooks/`.
3. The test for the screen -> `<Name>Page.test.tsx` beside it, through `renderApp` ([src/tests/AGENTS.md](../tests/AGENTS.md)).

## Conventions

- A page renders one `<main>` with one `<h1>`; tests find the screen by that heading.
- Named export (the router takes elements, so no page needs a default export).
- A page reads server data through a hook in `src/hooks/` or TanStack Query over `src/utils/`.
- Canonical example: `(auth)/sign-in/SignInPage.tsx` with `SignInPage.test.tsx`.

## Inventory

- `(webapp)/application/ApplicationPage.tsx`: `/`, the Application page: "Welcome to the application." and "Signed in as {name}" from `GET /api/users/me`.
- `(auth)/sign-in/SignInPage.tsx`: `/sign-in`; `(auth)/sign-up/SignUpPage.tsx`: `/sign-up`. Both frame their form in `AuthScreen`.
- `not-found/NotFoundPage.tsx`: every path with no route.
