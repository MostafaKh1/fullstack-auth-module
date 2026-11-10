# frontend/src/components/AGENTS.md

Shared presentational components: UI that more than one page or feature renders, styled with Tailwind and CVA. The component rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Architecture: front end").

## Where does this file belong?

1. UI reused across pages or features, driven only by props (a button, a field, an alert, a badge) -> `<name>.tsx` here.
2. UI that knows about the Session, a form schema or an endpoint -> its feature in `src/features/`.
3. UI that one page alone uses -> inside that page until a second caller appears.

## Conventions

- One component per file: `text-field.tsx` exports `TextField`, named.
- Variants are a `cva(...)` declared above the component; `Props` is `VariantProps<typeof x> & { className?: string; ... }`, and the root's classes are `cn(x({ ...variants }), className)`.
- A component imports only from `src/lib/` and its own libraries; text arrives as `children` or props, so copy stays with the page or feature.
- Use the native element with the right role (`<button>`, `<p role="status">`) so tests and assistive tech find it by role.
- Canonical example: `alert.tsx`.

## Inventory

- `alert.tsx`: `Alert`, a `role="alert"` message (`tone`: `error`).
- `button.tsx`: `Button` (`variant`: `primary` / `ghost`, `size`: `md` / `sm`); `pending` disables it, sets `aria-busy` and shows a spinner.
- `text-field.tsx`: `TextField`, a labelled input whose `error` is linked by `aria-describedby` and sets `aria-invalid`; `trailing` sits inside the input, `children` below it.
- `page-loader.tsx`: `PageLoader`, a full-page `role="status"` loading state.
