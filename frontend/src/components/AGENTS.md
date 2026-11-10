# frontend/src/components/AGENTS.md

Every component that is not a page, in four sections, styled with Tailwind and CVA. Naming follows [frontend/AGENTS.md](../../AGENTS.md) ("Naming and exports"); the component rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Architecture: front end").

## Where does this file belong?

The first match wins:

1. A route guard or other app chrome that wraps pages -> `layout/<group>/`.
2. A loading state, fallback or other small cross-cutting piece with no design-system role -> `utility/`.
3. A single-purpose control driven only by props (a button, an input, a badge) -> `base/<kind>/`.
4. Anything built from base components, or that knows about the Session, a form schema or an endpoint -> `composite/<group>/`.
5. UI one page alone uses and no second caller is in sight -> still here, in the section it fits; pages hold no components of their own.

## Conventions

- One component per file, `<Name>.tsx` exporting `<Name>`, named. A section's subfolders are kebab-case and plural, named for a kind (`buttons/`, `inputs/`, `route-guards/`, `banners-and-notifications/`).
- A component with children of its own becomes a folder named after it (`AuthScreen/`), holding `AuthScreen.tsx` and children prefixed `AuthScreen…`; its non-component helpers are kebab-case and prefixed (`auth-screen-api-failure.ts`).
- Variants are a `cva(...)` declared above the component; `Props` is `VariantProps<typeof x> & { className?: string; ... }`, and the root's classes are `cn(x({ ...variants }), className)`.
- Use the native element with the right role (`<button>`, `<p role="status">`) so tests and assistive tech find it by role.

## `base/`

Atoms driven only by props: they import `src/utils/cn.ts` and their own libraries, nothing else in the app; text arrives as `children` or props. Canonical example: `buttons/Button.tsx`.

- `buttons/Button.tsx`: `Button` (`variant`: `primary` / `ghost`, `size`: `md` / `sm`); `pending` disables it, sets `aria-busy` and shows a spinner.
- `inputs/TextField.tsx`: `TextField`, a labelled input whose `error` is linked by `aria-describedby` and sets `aria-invalid`; `trailing` sits inside the input, `children` below it.

## `composite/`

Compound UI built from `base/` and `utility/`; it may use `src/hooks/` and `src/utils/`. Canonical example: `banners-and-notifications/Alert.tsx` for a plain one, `auth/AuthScreen/` for a folder.

- `banners-and-notifications/Alert.tsx`: `Alert`, a `role="alert"` message (`tone`: `error`).
- `auth/AuthScreen/` ([ADR 0008](../../../docs/adr/0008-front-end-session-handling.md)):
  - `AuthScreen.tsx`: `AuthScreen`, the frame of both forms (a brand panel beside a card).
  - `AuthScreenSignUpForm.tsx`, `AuthScreenSignInForm.tsx`: the forms, React Hook Form with the field rules as resolver; a success calls `startSession()`.
  - `AuthScreenPasswordField.tsx` (show/hide toggle), `AuthScreenPasswordChecklist.tsx` (the live checklist), `AuthScreenSwitchLink.tsx` (a link to the other form that keeps the return path).
  - `AuthScreenFieldRules.ts`: `signUpSchema`, `signInSchema`, `passwordRule`; errors are rule ids. The front end's copy of the field rules; the back end's is `backend/src/auth/auth.types.ts`; change both in the same commit.
  - `AuthScreenFieldRules.examples.ts`: the worked-examples table, identical to `backend/src/test/support/field-rules.examples.ts`; the page tests run every row.
  - `auth-screen-api-failure.ts`: `applyApiFailure`, a failed request's issues onto fields or the form alert (`FORM_ALERT`).
  - `auth-screen-return-path.ts`: `ReturnState` and `returnPath()`, the path a guard carries in location state.

## `layout/`

Wrappers around pages, not content; they may use `src/hooks/` and the other sections. Canonical example: `route-guards/RequireSession.tsx`.

- `route-guards/RequireSession.tsx`, `route-guards/RequireSignedOut.tsx`: the two guards wrapped around elements in `src/app/routes.tsx`; both show `PageLoader` while the Session is `restoring`.

## `utility/`

Small cross-cutting components with no design-system role; they import only `src/utils/`.

- `PageLoader.tsx`: `PageLoader`, a full-page `role="status"` loading state.
