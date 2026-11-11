# frontend/src/providers/AGENTS.md

React context providers, each mounted once in `src/app/App.tsx`. The Session context is the only client state ([ADR 0008](../../../docs/adr/0008-front-end-session-handling.md)).

## Conventions

- `<Name>Provider.tsx` (PascalCase) exports the provider; its context and types sit in a kebab-case `<name>-context.ts` beside it, so a hook can import the context without the provider.
- A component reads a context through its hook in `src/hooks/`, never by calling `use(SessionContext)` itself.
- Canonical example: `SessionProvider.tsx`.

## Inventory

- `session-context.ts`: `Session` (`restoring` / `signed-in` / `signed-out`), `SessionContextValue`, `SessionContext`.
- `SessionProvider.tsx`: `SessionProvider`. It boots `restoring` and calls `refreshSessionOnce()`; `startSession()` stores the access token in the API client; `endSession()` (Sign out) calls `signOut()` and ends the Session in the tab whether or not the call succeeded (ADR 0008); a failed refresh, at boot or on a `401`, makes it `signed-out`. Ending a Session clears the token and the query cache. It is the only writer of the token.
