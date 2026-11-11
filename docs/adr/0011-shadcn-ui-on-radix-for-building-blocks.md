# The front end's building blocks come from shadcn/ui on Radix, committed as our own code

The front end's buttons, inputs, labels, form fields, cards and alerts are shadcn/ui components on Radix, so roles, label and error associations, focus and keyboard behaviour are provided rather than re-implemented in each hand-rolled component.
shadcn/ui is not a dependency: its CLI copies each component's source into the repository, where it is renamed and placed by the front end's structure rules (`frontend/AGENTS.md`), held to the same lint and comment rules as the rest, and changed freely. What remains a dependency is the Radix primitives under it (today `@radix-ui/react-slot` and `@radix-ui/react-label`), reached only through one thin wrapper each in `src/components/primitives/`, so the behaviour they provide lives in one layer; Biome rejects an `@radix-ui` import anywhere else.
The theme is shadcn's "new-york" style with the slate base colour, expressed as CSS variables mapped into Tailwind 4 through `@theme inline` in `src/index.css`, with the existing indigo as the primary colour. Dark mode follows the operating system's `prefers-color-scheme`, the same condition as Tailwind's `dark:` variant, with no toggle.

## Considered options

- **Keep hand-rolling.** No new dependency and nothing to learn, but every input and button carries its own accessibility, nothing checks it, and each new screen repeats it. The project's components were already Tailwind and CVA in the shape shadcn/ui uses, so adopting it changes the source of the components more than their style.
- **Radix alone, with our own styling.** Radix provides the hard behaviour (focus management, keyboard handling, ARIA wiring), but each styled component around it would still be designed and written here, and the form-field composition (label, control and message tied together by ids) would be ours too. shadcn/ui is that layer, already written, on the same Radix.
- **A full UI kit (MUI, Chakra, Mantine).** Fastest to a first screen, but its theming fights Tailwind, its components cannot be edited, only overridden through its API, and its bundle is large for three screens. ADR 0006 already rejected one for these reasons.

## Consequences

- A component is added with `npx shadcn@latest add <name>` from `frontend/` (`components.json` holds the configuration), then moved and renamed by the structure rules, its `cn` import pointed at `@/utils/cn`, and its Radix import replaced by a primitive. The CLI's own `cn` and `radix-ui` packages are not installed. Only components a screen needs are adopted.
- Generated components are edited where the app needs it, and the commit says how they differ: the Button keeps a `pending` state, `FormMessage` shows the copy map's sentence for its error, since an error's `message` holds a code ([ADR 0002](0002-api-errors-carry-codes-not-copy.md)), and the parts no screen uses are left out. An upgrade from upstream is a diff read by hand, not a version bump.
- The dark primary is indigo-400 under near-black text: white on indigo-500, the hand-rolled dark button, falls short of the 4.5:1 contrast that small text needs.
- Screens move one at a time, the hand-rolled text field, button and alert staying beside the adopted components until nothing uses them; the hand-rolled button is `HandRolledButton` meanwhile, since the adopted one holds `base/buttons/Button.tsx`.
- axe runs in the rendered-app tests over each screen as it moves to the adopted components, empty and with its errors shown, so a regression in the provided behaviour fails a test. jsdom computes no colours, so contrast is checked in the browser, not there.
