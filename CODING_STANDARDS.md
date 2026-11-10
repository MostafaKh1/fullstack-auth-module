# Coding Standards

The rules a reviewer holds every change to.
Anything Biome, Prettier or the TypeScript compiler already enforces is not repeated here; this file is for the rules no tool can check, and for the reasons behind the ones that look arbitrary.

## Architecture: back end

### Three doors

Every back-end capability has exactly one door, and the door is injected:

- **The database is reached only through a repository** (`UserRepository`, `SessionRepository`). Nothing outside `src/database/` imports `mongoose` or a model. A repository injects its model and nothing else: repositories have no outward edges.
- **Configuration is read only through `AppConfigService`.** No file outside `src/config/` reads `process.env`. The environment is parsed with Zod at boot and the process crashes on an invalid value, so a misconfiguration fails at start-up and not under load.
- **The current time and randomness come from where they can be controlled in tests.** Token, secret and expiry logic takes `now` from an injected clock or as an argument, never `Date.now()` buried in a helper.

### One operation, one handler

- A business operation is one `@Injectable()` class in `src/features/<feature>/handlers/<operation>.handler.ts`, with `execute` as its **only** public method.
- A handler knows nothing about HTTP: no `Request`, `Response`, cookies, status codes or decorators from `@nestjs/common` beyond `Injectable`. It throws `ApiError` with a code from the closed set and returns plain data.
- A handler holds the operation's ordering and failure policy, and reaches the database through repositories.
- Pure logic shared by handlers is a module-level `export function` in a sibling `*.rules.ts`.

### Controllers are transport

- One controller per feature, one method per route. A method extracts the request (body, current Session, cookie), calls **one** handler, and shapes the response.
- Setting or clearing the refresh cookie is transport, so it happens in the controller, never in a handler.
- The controller method's field for an injected handler carries a `Handler` suffix (`signUpHandler`).

### Modules

- Module tiers, lowest first: `AppConfigModule` and `LoggingModule` (global) -> `DatabaseModule` (models and repositories) -> `AuthModule` (token service, global guard) -> feature modules (`auth`, `users`, `health`).
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

- Passwords are stored only as argon2id hashes; refresh secrets only as SHA-256 hashes ([ADR 0001](docs/adr/0001-session-record-with-short-lived-access-token.md)).
- Secret comparisons are constant-time.
- A query that needs a secret field selects it explicitly; secret fields are excluded from every default projection, so no response can leak one by accident.

## Architecture: front end

- Pages live in `src/pages/`, one per route, default-exported only where the router requires it; every other component is a **named** export.
- Props are `type Props = { ... }`, not `interface`.
- A component that renders a styleable root accepts `className` and composes it with `cn()`, so a caller can override classes deterministically. Variants are expressed with CVA, not conditional class strings.
- Server state goes through TanStack Query; the only client state is the Session context. No component calls axios directly: it calls a function in `src/api/`.
- Forms use React Hook Form with the Zod schema from `src/features/auth/schemas.ts` as the resolver. Server `issues` are applied with `setError` on the field named by `path`.
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

- Code is the documentation. A comment explains a _why_ the code cannot say: a security reason, a library gotcha, a deliberate deviation.
- Doc headers stay short and say what the thing is for.
- A comment never narrates a change ("changed X to Y"); that belongs in the commit message.

## Naming

- Domain names come from [GLOSSARY.md](GLOSSARY.md): `signUp`, `signIn`, `signOut`, `Session`, `User`. Avoided synonyms (`login`, `register`, `account`) do not appear in identifiers, routes, copy or test names.
