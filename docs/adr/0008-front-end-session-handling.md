# Front-end Session handling: the access token in memory, one Session context, two guards

The return path in location state is superseded by [ADR 0009](0009-auth-forms-addressed-by-search-parameter.md): it now travels as a checked `returnTo` search parameter. The rest of this record stands.

The access token from Sign up, Sign in or refresh is kept only in a module variable of the API client (`src/utils/api-client.ts`), which attaches it as `Authorization: Bearer` to every request; it is never written to `localStorage`, `sessionStorage` or a readable cookie, so an injected script cannot lift a credential that outlives the tab.
Whether the tab has a Session is one React context (`src/providers/SessionProvider.tsx`) with three states: `restoring` (the app is asking the back end whether the refresh cookie still holds a Session), `signed-in` (with the User), and `signed-out`; the context is the only writer of the token.
Two route guards read it: `RequireSession` sends a signed-out visitor to Sign in carrying the path, query and hash they asked for in the router's location state, and `RequireSignedOut` sends a signed-in User away from Sign in and Sign up, to that carried path or the Application page; both show a full-page loading state while `restoring`, so the wrong page never flashes.
Because `RequireSignedOut` does the redirect, a successful Sign up or Sign in only starts the Session; the forms never navigate themselves.

## Considered options

- **The token in `localStorage` or `sessionStorage`.** Survives a reload without a refresh call, but any script on the page can read it ([ADR 0001](0001-session-record-with-short-lived-access-token.md)). A reload instead restores the Session through the `httpOnly` refresh cookie.
- **The token in React state, passed to each API function.** Keeps it out of module scope, but every call site would thread it through, and the refresh-on-401 logic belongs once in the client, not in each caller.
- **The return path in a `?returnTo=` query parameter.** Survives being copied as a link, but it is user-controlled input in the URL that must be validated against open redirects. Location state is set only by the app; it is still checked to be an in-app path.
- **Navigating from the form's success handler.** Splits "where does a signed-in User go" between the forms and the guard; with the guard alone, a User who is signed in by any means lands in the same place.

## Consequences

- A reload has no token: the app must call `POST /api/auth/refresh` once on boot, while the context is `restoring`, before any guard decides.
- The token module is shared by the whole tab, so the provider clears it when it unmounts; tests rendering the app again start signed out.
