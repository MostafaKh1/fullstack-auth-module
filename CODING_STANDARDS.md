# Coding Standards

The rules a reviewer holds every change to.
Anything Biome, Prettier or the TypeScript compiler already enforces is not repeated here; this file is for the rules no tool can check, and for the reasons behind the ones that look arbitrary.

## Architecture: back end

### Three doors

Every back-end capability has exactly one door, and the door is injected:

- **The database is reached only through a repository** (`UserRepository`, `SessionRepository`). Nothing outside `src/database/` imports `mongoose` or a collection. A repository injects its model and nothing else: repositories have no outward edges.
- **Configuration is read only through `AppConfigService`.** No file outside `src/config/` reads `process.env`. The environment is parsed with Zod at boot and the process crashes on an invalid value, so a misconfiguration fails at start-up and not under load.
- **The current time and randomness come from where they can be controlled in tests.** Token, secret and expiry logic takes `now` from the injected `ClockService` or as an argument, never `Date.now()` buried in a helper.

### Controller, service, repository

The layering of [ADR 0010](docs/adr/0010-controller-service-repository-layering.md). Biome's `noRestrictedImports` (`biome.jsonc`) enforces the import rules marked _(lint)_.

| Layer                                                       | Owns                                                                                                                                                            | Never                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Controller (`<module>.controller.ts`)                       | the route, extracting body, headers and the current User, calling **one** service method, calling `AuthCookiesService`, mapping the result to the response type | business decisions, `ClockService`, `AppConfigService`, repositories _(lint)_                |
| Service (`<name>.service.ts`)                               | the operation's rules, ordering and failure policy, throwing `ApiError`                                                                                         | `Request`, `Response`, `express` _(lint)_, cookies _(lint)_, status codes, Mongoose _(lint)_ |
| Repository (`database/repositories/<entity>.repository.ts`) | queries and writes for one collection, mapping documents onto the domain types                                                                                  | business rules, other collections                                                            |

- A module's business logic is one service named for its area (`AuthService`, `UsersService`, `HealthService`), with one public method per operation (`signUp`, `getCurrentUser`). A rule several operations share is a service of its own (`SessionService`) or a private function in the service's file, never a free-floating rules file.
- A service throws `ApiError` with a code from the closed set and returns plain data typed with the domain types (`User`, `Session` in `src/features/auth/auth.types.ts`, `AuthContext` in `src/common/services/access-token.service.ts`), never a type from `src/database/`.
- Setting or reading the refresh cookie is transport: the controller calls `AuthCookiesService`, which owns the whole cookie policy. A service returns the credential and never sees the response.
- A controller's field for an injected service is the class name in camelCase (`authService`).

### Modules

- Module tiers, lowest first: `AppConfigModule`, `LoggingModule` and `CoreModule` (global) -> `PersistenceModule` (collections, repositories, the database health ping) -> `CommonModule` (the token, password and cookie services, the global guard) -> feature modules in `src/features/` (`auth`, `users`, `health`). `src/common/` holds what the global guard or more than one feature needs, by kind (`decorators/`, `errors/`, `filters/`, `guards/`, `pipes/`, `services/`), and imports nothing from a feature.
- A repository imports the domain types from `src/features/auth/auth.types.ts` as types only, so no runtime edge points to a higher tier.
- A module imports only from a lower tier. A feature module exports nothing and never imports another feature module. `forwardRef` is never needed and never used.

### Authentication is deny-by-default

- A global guard requires a valid access token on every route.
- A route opts out with `@Public()`, and only the Sign up, Sign in, refresh, Sign out and health routes do.
- The refresh and Sign out routes authenticate with the refresh cookie and also pass the `Origin` check.

### Errors

- Every error leaving the API is the envelope in [ADR 0002](docs/adr/0002-api-errors-carry-codes-not-copy.md), produced by the one global exception filter.
- Code throws `ApiError(code, { issues? })`. Branching anywhere on an error's message text is a bug: branch on `code`.
- A code is added to the closed set on the back end and to the copy map on the front end in the same change.
- A 5xx is logged with its stack; nothing internal (stack, driver error, query) reaches the response.

### Logging

- Log only through the injected pino logger. `console.*` does not appear in application code.
- Pass structured data first: `logger.info({ userId }, "session.created")`. pino drops trailing arguments, so `logger.info("msg", obj)` silently loses `obj`.
- Secrets never reach a log line: passwords, tokens, the refresh cookie and `Authorization` headers are on the redact list, and new secret-bearing fields are added to it, not hand-masked.

### Secrets

- Passwords are stored only as scrypt hashes (`node:crypto`, per-password salt, parameters encoded in the hash); refresh secrets only as SHA-256 hashes ([ADR 0001](docs/adr/0001-session-record-with-short-lived-access-token.md)).
- Secret comparisons are constant-time.
- A query that needs a secret field selects it explicitly; secret fields are excluded from every default projection, so no response can leak one by accident.

## Architecture: front end

- Pages live in `src/pages/`, one `<Name>Page.tsx` per route, default-exported only where the router requires it; every other component is a **named** export.
- Props are `type Props = { ... }`, not `interface`.
- A component that renders a styleable root accepts `className` and composes it with `cn()`, so a caller can override classes deterministically. Variants are expressed with CVA, not conditional class strings.
- Server state goes through TanStack Query; the only client state is the Session context. No component calls axios directly: it calls a function in `src/utils/<resource>-api.ts`.
- Forms use React Hook Form with the Zod schema from `src/components/composite/AuthScreen/AuthScreenFieldRules.ts` as the resolver. Server `issues` are applied with `setError` on the field named by `path`.
- Every user-facing sentence lives in the front end. Error copy is looked up by `code` in one map; a code with no entry falls back to a generic sentence, never to the server's `message`.

## Validation rules

- The field rules exist twice, once per app, because there is no shared package. Each copy carries a comment pointing at the other, and both suites test the same table of worked examples. A rule changes in both places in the same commit.
- [docs/requirements.md](docs/requirements.md) is the authority. When code and that file disagree, the code is wrong.

## Tests

- Tests live at the agreed seams only: the back end's HTTP API, the front end's rendered app with the network faked by MSW, and the Playwright journeys. A test that reaches past a seam into a private method or a collaborator mock is rewritten at the seam.
- Expected values come from the spec or a worked example, never recomputed the way the code computes them.
- Back-end integration tests seed data through the raw collection, never through the repository under test, so a broken write and a broken read cannot agree with each other.
- A test name reads as a behaviour in glossary terms: `"a replayed refresh credential revokes the Session"`, not `"refresh() throws"`.

## Comments

A comment earns its place by saying a _why_ the code cannot say. Where the code can explain itself, there is no comment.

- **Keep or write one** for a security property, a library or platform gotcha, a deliberate deviation from the obvious approach, a non-obvious trade-off, or a constraint from an ADR (cite it).
- **Delete one that restates** the symbol's name or the next line.
- **Delete or rewrite one that narrates** a change or history ("changed X to Y", "now", "no longer", "used to", a ticket number). That belongs in the commit message.
- **Doc headers** only on exported symbols whose purpose is not obvious from their name and type, and one line. A reason that needs more is a why-comment, not a header.
- **Tests**: the test's name says the behaviour. A comment in a test only explains a non-obvious setup.

A good comment gives the reason, and cites the ADR when it rests on one:

```ts
// A replaced secret replayed after the grace window: two parties hold the credential, so the Session ends (ADR 0001).
```

A good doc header is one line that says what the name cannot:

```ts
/** Deny by default. One read of the Session by primary key per request, so Sign out takes effect at once (ADR 0001). */
```

A bad comment restates the code, or says what changed:

```ts
/** Gets the current user. */
async getCurrentUser(userId: string) {}
// Now uses scrypt instead of argon2 (ticket 12).
```

The narration above becomes a reason, or nothing:

```ts
// scrypt from `node:crypto`: a native addon such as argon2 is blocked on the development machine (ADR 0007).
```

In a test, a good comment explains the setup, and a bad one repeats the name:

```ts
// Cheap hashing: these rows test the field rules, not the hash.
// Signs the User in.
```

## Naming

- File and folder names follow each app's naming rule ([backend/AGENTS.md](backend/AGENTS.md), [frontend/AGENTS.md](frontend/AGENTS.md), "Naming and exports"): a file's name says what it exports, and a class or component is named for its file.
- Domain names come from [GLOSSARY.md](GLOSSARY.md): `signUp`, `signIn`, `signOut`, `Session`, `User`. Avoided synonyms (`login`, `register`, `account`) do not appear in identifiers, routes, copy or test names.
