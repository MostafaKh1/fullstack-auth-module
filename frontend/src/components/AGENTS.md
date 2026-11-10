# frontend/src/components/AGENTS.md

Shared presentational components: UI that more than one page or feature renders, styled with Tailwind and CVA. The component rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Architecture: front end").

## Where does this file belong?

1. UI reused across pages or features, driven only by props (a button, a field, an alert, a badge) -> `<name>.tsx` here.
2. UI that knows about the Session, a form schema or an endpoint -> its feature in `src/features/`.
3. UI that one page alone uses -> inside that page until a second caller appears.

## Conventions

- One component per file: `status-badge.tsx` exports `StatusBadge`, named.
- Variants are a `cva(...)` declared above the component; `Props` is `VariantProps<typeof x> & { className?: string; ... }`, and the root's classes are `cn(x({ ...variants }), className)`.
- A component imports only from `src/lib/` and its own libraries; text arrives as `children` or props, so copy stays with the page or feature.
- Use the native element with the right role (`<button>`, `<p role="status">`) so tests and assistive tech find it by role.
- Canonical example: `status-badge.tsx`.

## Inventory

- `status-badge.tsx`: `StatusBadge`, a `role="status"` pill with `checking` / `up` / `down` variants.
