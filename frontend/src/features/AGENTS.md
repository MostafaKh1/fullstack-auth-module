# frontend/src/features/AGENTS.md

One folder per capability (`auth` first): the forms, Zod schemas, hooks and context that give a page its behaviour.

## Where does this file belong?

1. A form's Zod schema and the field rules behind it -> `<feature>/schemas.ts` (`src/features/auth/schemas.ts`), the front end's copy of the field rules, with a comment pointing at the back end's copy.
2. A form component -> `<feature>/<name>-form.tsx` (`sign-up-form.tsx`), React Hook Form with the schema as resolver.
3. A hook over the feature's server state -> `<feature>/use-<name>.ts`, wrapping TanStack Query over `src/api/`.
4. The Session context, its provider and `use` hook -> `auth/`, beside the forms that start a Session; the provider is mounted in `src/app/app.tsx`.
5. A route guard -> beside the Session context it reads, wrapped around elements in `src/app/routes.tsx`.
6. UI with no knowledge of the feature -> `src/components/`.

## Conventions

- A feature imports `src/api/`, `src/components/` and `src/lib/`, never another feature or a page.
- File naming and exports follow [frontend/AGENTS.md](../../AGENTS.md) ("Naming and exports").
- The front end's copy of the worked-examples table sits beside the schema; the page tests run every row through the rendered app, as the back end's tests do over HTTP.

## Inventory

`auth/` ([ADR 0008](../../../docs/adr/0008-front-end-session-handling.md)):

- `schemas.ts`: `signUpSchema`, `signInSchema`, and `passwordRule` (the predicates the checklist shares); errors are rule ids.
- `field-rules.examples.ts`: the worked-examples table, identical to `backend/test/field-rules.examples.ts`.
- `session-context.ts`, `session-provider.tsx`, `use-session.ts`: the `Session` (`restoring` / `signed-in` / `signed-out`), `SessionProvider` and `useSession()`, whose `startSession()` stores the access token in the API client. The provider boots `restoring` and calls `refreshSessionOnce()`; a failed refresh, at boot or on a `401`, makes it `signed-out`.
- `require-session.tsx`, `require-signed-out.tsx`, `return-path.ts`: the two route guards and the return path they carry in location state.
- `sign-up-form.tsx`, `sign-in-form.tsx`: the forms; `apply-api-failure.ts` puts a failed request's issues on fields or the form alert.
- `password-field.tsx` (show/hide toggle), `password-checklist.tsx` (the live checklist), `auth-layout.tsx` (the frame of both forms), `auth-link.tsx` (a link between them that keeps the return path).
- `use-current-user.ts`: `useCurrentUser()`, the protected endpoint through TanStack Query (`["users", "me"]`).
