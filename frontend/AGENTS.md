# frontend/AGENTS.md

React 19 + Vite + TypeScript single-page app. Architecture and its reasons: [ADR 0006](../docs/adr/0006-front-end-architecture.md); the rules a reviewer holds: [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: front end").

## Layers

Imports point down this table only. A layer may skip the ones between (a page may import `utils/`), never point up.

| Layer      | Folder            | Owns                                                                                                        |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| App        | `src/app/`        | the providers around the router (`App.tsx`), the one route table, the query client                          |
| Pages      | `src/pages/`      | one screen per route, composing components                                                                  |
| Components | `src/components/` | every component that is not a page, in five sections (see below)                                            |
| Hooks      | `src/hooks/`      | hooks two or more components or pages use                                                                   |
| Providers  | `src/providers/`  | React context providers mounted once in `App` (the Session, the theme), and the contexts a hook reads       |
| Utils      | `src/utils/`      | framework-free helpers: `api/` (the HTTP client and one module per resource), `auth-url/`, `cn()`, the copy |

`src/tests/` is the rendered-app harness and sits outside the stack (see "Tests"). `src/main.tsx` is the browser entry; it and the harness build the app from the same `src/app/` files, so tests run the real providers and routes.

## Where does this file belong?

Take the first that fits. Each line names the file to copy where one exists.

1. **A screen at a URL** -> `src/pages/<group>/<route>/<Name>Page.tsx`, plus its entry in `src/app/routes.tsx` (the only place a route is added; a route guard wraps elements there). A parenthesised group (`(auth)`, `(webapp)`) groups screens by who sees them and adds nothing to the URL; the route folder is named for the path or, for Sign in and Sign up (both at `/`), for their `auth` value ([ADR 0009](../docs/adr/0009-auth-forms-addressed-by-search-parameter.md)). A protected screen goes inside `RequireSession`. Copy `src/pages/(auth)/sign-in/SignInPage.tsx`.
2. **A component** -> `src/components/`, in the first section that fits, in this order:
   1. `primitives/`: an accessible, behaviour-only building block that owns roles, focus and keyboard handling and knows nothing of the app. Flat: `primitives/<Name>.tsx`, no folders. Each wraps one Radix part, and nothing else imports `@radix-ui` (Biome rejects it). Copy `primitives/Slot.tsx`.
   2. `base/<kind>/`: a styled atom, built on primitives, usually from shadcn/ui, that knows nothing of the app: it is driven by props, and the `Form*` parts also read the form's context through `useFormField` (see "shadcn/ui"). Copy `base/buttons/Button.tsx`; a family of parts is a component folder with one part per file: copy `base/cards/Card/`.
   3. `composite/<kind>/`: a compound component, or anything that knows about the Session, a form schema or an endpoint. A screen (`<Name>Screen`) goes in `composite/screens/`: copy `composite/screens/AuthScreen/`.
   4. `layout/<kind>/`: application chrome and routing pieces, such as route guards and route switches. Pages arrive as props. Copy `layout/route-guards/RequireSession.tsx`.
   5. `utility/`: a small cross-cutting piece with no design role (a loading state, a fallback). Copy `utility/PageLoader.tsx`.

   UI one page alone uses still goes here: pages hold no components of their own. A feature module that two or more routes share has no section yet; agree its place in the spec before adding one.

3. **A hook** used by two or more components or pages -> `src/hooks/useX.ts` (copy `useSession.ts`). One used by a single component -> that component's folder, as `<Folder>UseX.ts` (the component becomes a folder if it is a file); the structure check treats a `<Folder>UseX` file as a hook, and moves it to `hooks/` once two files use it. Copy `useFormField.ts`: the `Form*` parts share it, and its two contexts sit in `src/providers/` so the hook can import them.
4. **An app-wide context** -> `src/providers/<Name>Provider.tsx`, its context and types in `<name>-context.ts` beside it (so a hook can import the context without the provider; the `Form*` parts' two contexts have no provider of their own, since `FormField` and `FormItem` provide them), mounted in `src/app/App.tsx` inside the query client. Copy `SessionProvider.tsx`.
5. **A call to an endpoint** -> for a route in the contract, nothing: a page or component uses the oRPC client's TanStack Query helpers, `orpc.<feature>.<procedure>` from `src/utils/api/orpc-client.ts` (copy `AuthScreenSignUpForm.tsx`). A route not yet in the contract is added to it first, test first ([contract/AGENTS.md](../contract/AGENTS.md)); the app has no other HTTP client. A read is `useQuery(orpc.<feature>.<procedure>.queryOptions())` (copy `ApplicationPage.tsx`).
6. **Any other helper** -> a kebab-case module in `src/utils/` (copy `cn.ts`), or in the concern folder it belongs to. Three helpers at the top of `src/utils/` that start with the same word make a concern: they move into `src/utils/<concern>/`, which then holds every helper of that concern, as `api/` holds the resource modules and the refresh interceptor and `auth-url/` holds the `returnTo` rule. `cn.ts` and `error-copy.ts` stay at the top.
7. **A test** -> beside the file it covers, named after it (see "Tests"). Copy `src/pages/(auth)/sign-in/SignInPage.test.tsx`.

### Sections import in one direction

Dependencies point from app-aware toward behaviour-only: base imports primitives; composite imports primitives, base and utility; layout imports all four; primitives and utility import no other section. Primitives and utility import nothing in the app outside `components/` but `src/utils/`; base imports also `hooks/` and `providers/`, for the form context its `Form*` parts read. No component imports `pages/`, `app/` or `tests/`.

## shadcn/ui

The building blocks come from shadcn/ui on Radix ([ADR 0011](../docs/adr/0011-shadcn-ui-on-radix-for-building-blocks.md)). Icons are inline SVG paths written in the component that uses them (the sun and moon in `ThemeToggle`, the eye in `PasswordInput`), wrapped in `base/icons/Icon.tsx`, which supplies only the `svg` element; there is no icon library. Adopted so far: `Button`, `Input` (and `PasswordInput` on it), `Label`, `Form`, `Card` and `Alert`. They are the only way to build a button, a text field, a form field, a card, a failure message or the page loader (`utility/PageLoader.tsx`): no screen or component hand-rolls one. A field is `FormField` > `FormItem` > `FormLabel`, `FormControl` around the input, and `FormMessage`, which shows `errorCopy()` of the field's code: copy `composite/screens/AuthScreen/AuthScreenSignInForm.tsx`. The Sign in and Sign up forms share `AuthScreenForm` (the submit, the failure alert, the button) and `AuthScreenEmailField`; each keeps only the fields and schema that differ.

- **Adding one**: `npx shadcn@latest add <name>` from `frontend/` (`components.json` holds style new-york, base colour slate, CSS variables). Then move it into its base kind folder, PascalCase with one export per file (a family becomes a component folder); point its `cn` import at `@/utils/cn`; replace its `radix-ui` import with a primitive (adding the `@radix-ui/react-<part>` package and its wrapper if none exists); uninstall the `cn` and `radix-ui` packages the CLI adds; drop the parts and variants no screen uses; hold it to the comment rule. Add only what a screen needs now.
- **Colours** are the theme tokens in `src/index.css` (`bg-primary`, `text-muted-foreground`, `border-input`): shadcn's variables mapped through `@theme inline`. Dark values apply under the `.dark` class on the document root, set by `ThemeProvider` (`src/providers/`) from the theme toggle (`composite/toggles/ThemeToggle/`, its hook beside it as `ThemeToggleUseTheme.ts`); light is the default and the system's preference is ignored. The theme is remembered in `localStorage` under `theme`, and the inline script in `index.html` reads that key to apply the class before the first paint, so keep the two in step. Change a colour there, not in a component; a Tailwind palette colour (`text-indigo-600`, `bg-slate-100`) in `components/`, `pages/` or `app/` fails the structure check. A colour no token fits becomes a token in `index.css` (the brand panel beside the forms has `bg-brand` and friends).

## Component folders

A component that grows children becomes a folder named after it, holding an entry file of the same name: `composite/screens/AuthScreen/AuthScreen.tsx`.

- Every child's name starts with its immediate folder's name: `AuthScreenSignInForm.tsx` in `AuthScreen/`.
- A child used by only one sibling moves inside that sibling, which becomes a folder in turn, and the child takes the sibling's prefix: `AuthScreen/AuthScreenSignUpForm/AuthScreenSignUpFormPasswordChecklist.tsx`. A child the entry or two siblings use stays where it is.
- The outside world imports the entry, or the child it needs, by its own path. No barrel files.
- Kind folders (`buttons/`, `screens/`, `route-guards/`) are plural kebab-case; base, composite and layout hold only kind folders.

## Naming

The case of a file name says what it holds:

- **Inside a component folder**, every file is PascalCase with the folder's prefix, whatever it holds: a component, a non-component module (`AuthScreenFormApiFailure.ts`), a test.
- **A component, page, provider or the app shell** is PascalCase, named after the one component it exports: `Button.tsx` exports `Button`, `SignInPage.tsx` exports `SignInPage`. A page is `<Name>Page.tsx`.
- **A hook** is `useX.ts` in camelCase: `useSession.ts` exports `useSession`; a hook of one component is `<Folder>UseX.ts`, PascalCase like the rest of its folder.
- **Everything else outside component folders** is kebab-case: helpers, contexts, test support (`access-token.ts`, `session-context.ts`, `render-app.tsx`). Folders outside `components/` are kebab-case.
- One public component or hook per file. Exports, `Props`, `className` and variants follow [CODING_STANDARDS.md](../CODING_STANDARDS.md) ("Architecture: front end"); for variants copy `Button.tsx`.
- Use the native element with the right role (`<button>`, `<p role="status">`) so tests and assistive tech find it by role.
- `.tsx` for files with JSX, `.ts` otherwise.
- Domain names come from [GLOSSARY.md](../GLOSSARY.md): `signIn`, never `login`.

## Imports

`@/` is `src/` (`paths` in `tsconfig.app.json`, `resolve.alias` in `vite.config.ts`, which Vitest inherits). Every import names its target from the root, `@/utils/cn`, so a file reads the same wherever it sits and a move rewrites one string. The one exception is a child of a component folder importing inside that folder with `./` (`./AuthScreenFormApiFailure`, `./AuthScreenSignUpForm/AuthScreenSignUpForm`). Biome rejects `../`; the structure check rejects `./` anywhere else.

## Pages

A page renders one `<main>` with one `<h1>` (tests find the screen by that heading) and a `<title>` naming the screen. It owns the screen's layout and its non-error copy, reads server data through a hook or TanStack Query over `src/utils/api/`, and is the only thing the route table imports. Canonical example: `src/pages/(auth)/sign-in/SignInPage.tsx` with its test.

## State

- **Server state** goes through TanStack Query: a page or hook calls `useQuery` / `useMutation` with the options oRPC's helpers build (`orpc.auth.signUp.mutationOptions()`), or, for a route not yet in the contract, over one function from `src/utils/api/`. Query keys are arrays led by the resource (`["users", "me"]`).
- **Client state** is the Session context only (restoring, signed in, signed out) ([ADR 0008](../docs/adr/0008-front-end-session-handling.md)). A component reads it through `useSession()`, never `use(SessionContext)`; a context hook throws when its provider is missing. Anything else is local `useState` or form state.
- The access token lives only in `src/utils/api/access-token.ts`'s memory, and `SessionProvider` is its only writer; the oRPC client reads it there (`currentAccessToken()`) for the Bearer header, for every request. A `401 auth.unauthenticated` on any route but the auth ones is answered once, centrally, never in a caller: the oRPC client's link interceptor (`orpc-client.ts`) refreshes through `refreshSessionOnce()` and sends the request again, once, by the rule `shouldRefreshAndRetry()`. `session-refresh.ts` shares one refresh among every caller and stops refreshing once Sign out begins; `SessionProvider` registers the listener that sends the refresh (its `orpc.auth.refresh` mutation) and hears its outcome.

## The API side

- **The oRPC client** is `src/utils/api/orpc-client.ts`, the one client built from the contract ([ADR 0012](../docs/adr/0012-shared-orpc-contract-in-an-npm-workspace.md)): oRPC's OpenAPI link at `/api` with credentials included, so the refresh cookie travels, the Bearer header, and a decoder that turns the envelope into an error with its code (`data.issues` for a validation failure) and the envelope as its `cause`; oRPC's own check then marks it `defined`, the contract's typed error, when the procedure declares that code. Its link interceptor is the refresh-and-retry of "State" above. It exports `orpc`, the TanStack Query helpers, `SignedIn`, what Sign up, Sign in and refresh answer, and `User`.
- Nothing outside `src/utils/` imports `@orpc/client`; nothing in `src/utils/` imports React or another app folder.
- A route is typed by the contract through the client. The error envelope's type is generated from `contract/openapi.json` into `src/utils/api/api-types.generated.ts` (`npm run generate:api`), never restated. The front end imports no code from the back end ([contract/AGENTS.md](../contract/AGENTS.md)).
- The `returnTo` safety rule has one implementation, `isSafeReturnTo()` in `src/utils/auth-url/return-to.ts`, and one table of worked examples beside it that the page tests run; a new unsafe form is a new row.

## Copy and errors

Every sentence a User reads is written in the front end ([ADR 0002](../docs/adr/0002-api-errors-carry-codes-not-copy.md)):

- A failed request rejects with the typed error decoded from the envelope; `apiErrorEnvelope()` in `utils/api/api-error.ts` reads the envelope from it, and the caller reads its `code`, never its `message`.
- `code` becomes a sentence through the one copy map, `errorCopy()` in `src/utils/error-copy.ts`, with a generic fallback for an unknown code; its error-code half is typed against the contract (`ApiErrorCode`), as is `expectedErrorCopy` in `src/tests/support/expected-copy.ts`, so a new code fails the typecheck until both have a sentence; a failure with no envelope (no response, or a proxy's page) reads as `unreachableCopy`.
- Each `issues` entry (`{ path, code }`) is set on its form field with React Hook Form's `setError`, and its rule id becomes the field's sentence through the same map; a taken email goes on the email field, anything else is a form-level alert (`applyApiFailure` in `AuthScreenFormApiFailure.ts`, which `AuthScreenForm` calls for both forms; `apiFailureCode` in `utils/api/api-error.ts` is the one rule from a failed request to its code, also used by the Application page). Every error message on a form is a code, the form-level alert's and a request with no envelope's (`clientErrorCode`) included, and is shown as `errorCopy(code)`: `FormMessage` for a field, `AuthScreenForm` for the alert.
- Copy that is not an error (headings, labels) sits in the page or component that shows it, as `SignInPage.tsx` does.
- The field rules and their worked-examples table are the contract's (`@app/contract/field-rules`, `@app/contract/field-rules.examples`): the forms resolve with them and the page tests run the table. Change a rule in `contract/`, not here.

## Tests

The only seam is the whole rendered app with its real router and providers, the network faked by MSW ([ADR 0004](../docs/adr/0004-quality-gates-and-test-seams.md)).

- A test of a screen or a journey -> `<Name>Page.test.tsx` beside the page; of a component, beside that component with its folder's prefix. `src/tests/setup/` is what Vitest runs before every file; a helper several tests share (a fixture, a handler factory, a form helper) -> a kebab-case file in `src/tests/support/`; a test of the harness sits beside the helper it pins.
- `await renderApp(path, { handlers })` renders the app as if the browser opened `path`, waits for the boot restore to settle and a page to show, and returns Testing Library's view plus `router` and a `user` from `user-event`. `renderRestoringApp` returns at once, for the loading state.
- The boot restore's `POST /api/auth/refresh` answers "no Session" unless `handlers` declares its own. Declare every request a test makes; an undeclared request fails the test with `Undeclared request: <METHOD> <path>`.
- A migrated screen's test asserts `await accessibilityViolations(container)` (`src/tests/support/accessibility.ts`, axe) is `[]`, empty and with its errors shown. jsdom computes no colours, so contrast is checked in the browser.
- Query by role and visible text, as a User would; await what appears after a request with `findBy*`. Expected sentences come from `src/tests/support/expected-copy.ts`, written apart from the app's copy map.
- Canonical example: `src/pages/(auth)/sign-in/SignInPage.test.tsx`.

## Structure check

`npm run check:structure` (from the repository root, `scripts/check-frontend-structure.mjs`) enforces every rule in "Where does this file belong?", "Component folders", "Naming", "Imports" and the colour rule in "shadcn/ui" over `src/`, and prints each violation as `<rule> <path>: <what to do>`. It runs in the pre-commit hook, in `npm run lint` and in the CI lint job. A new rule lands in the script with a planted violation in its tests (`npm run test:structure`, which runs the script over example trees).

## Container

`Dockerfile` builds the static files from the repository root (the workspace lockfile and the contract package are there) and serves them with nginx; `nginx.conf.template` proxies `/api` to `BACKEND_URL`, so the browser sees one origin as under the Vite dev proxy.

## Commands

Run from `frontend/`: `npm run generate:api`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`. Lint and format run from the repository root. `.env.example` lists every variable the app reads (`API_PROXY_TARGET`, used only by the dev proxy).

## Gotchas

- Rollup is overridden with `@rollup/wasm-node` in `package.json`: the development machine blocks unsigned native addons, so a dependency that ships a native `.node` binary cannot be added.
- Field lengths are counted in code points (`[...value].length`), as the back end counts them, never with UTF-16 `.length`.
- An `<input>` strips line breaks from its value, so a worked example containing one cannot reach the rules from a form; its test asserts that instead.
- Tests pass `retry: false` to `createQueryClient`, so a failed query shows at once.
