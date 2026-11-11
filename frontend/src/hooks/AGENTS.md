# frontend/src/hooks/AGENTS.md

Hooks that more than one component or page uses: over server state (TanStack Query over `src/utils/`) and over a context in `src/providers/`.

## Conventions

- One hook per file, `useX.ts` exporting `useX`, named.
- A server-state hook wraps `useQuery` / `useMutation` over one function from `src/utils/`, with a query key led by the resource (`["users", "me"]`).
- A context hook throws when its provider is missing.
- A hook only one component uses stays in that component's file.
- Canonical example: `useCurrentUser.ts`.

## Inventory

- `useSession.ts`: `useSession()`, the Session, `startSession()` and `endSession()`.
- `useCurrentUser.ts`: `useCurrentUser()`, the protected endpoint (`["users", "me"]`).
