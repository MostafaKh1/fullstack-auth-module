# frontend/src/features/AGENTS.md

One folder per capability (`auth` first): the forms, Zod schemas, hooks and context that give a page its behaviour. No feature exists yet; the first front-end Sign up and Sign in ticket creates `auth/` and lists what it adds below.

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

None yet.
