# AGENTS.md

Sign up / Sign in module: a React front end (`frontend/`) and a NestJS + MongoDB back end (`backend/`), as two independent npm apps under a thin root ([ADR 0003](docs/adr/0003-two-npm-apps-without-workspace-tooling.md)).

## Before you change anything

- Read [GLOSSARY.md](GLOSSARY.md) and name things with its terms.
- Read the ADRs in [docs/adr/](docs/adr/) that touch the area you are in; surface a contradiction instead of overriding it.
- The brief and its clarified rules are [docs/requirements.md](docs/requirements.md); they win over anything else.
- Read the `AGENTS.md` of the app you are editing, and in the back end the one of `src/common/` or `src/database/` when you work there: each names what belongs where and where a new file goes.
- Write and review code against [CODING_STANDARDS.md](CODING_STANDARDS.md): architecture, errors, logging, secrets, tests.

## How the two apps meet

The apps share no code; HTTP is the only contract between them.

- **The API contract** is the "API contract" table in [docs/spec/auth-module.md](docs/spec/auth-module.md): every route under `/api`, every error as the envelope of [ADR 0002](docs/adr/0002-api-errors-carry-codes-not-copy.md). A new error code or rule id lands in both apps in the same commit.
- **The dev proxy**: Vite forwards `/api` to the back end (`API_PROXY_TARGET`, read in `frontend/vite.config.ts`), so the browser sees one origin in development, as it does behind a reverse proxy in production.
- **The Session cookie**: the refresh credential travels in an `httpOnly` cookie scoped to `/api/auth`; the access token lives only in front-end memory ([ADR 0001](docs/adr/0001-session-record-with-short-lived-access-token.md)). The one-origin proxy is what makes the cookie and the `Origin` check behave the same in both environments.
- **The field rules** exist once per app, each copy pointing at the other ([CODING_STANDARDS.md](CODING_STANDARDS.md), "Validation rules").

## Where things are

- [backend/AGENTS.md](backend/AGENTS.md) and [frontend/AGENTS.md](frontend/AGENTS.md): each app's architecture: its layout, what belongs where, its naming rule and its tests. The back end's `src/common/` (shared by every feature) and `src/database/` (the only door to MongoDB) have their own.
- **Naming**: a file's name alone says where it lives and what it holds. The back end is kebab-case with a role suffix (`auth.service.ts`); the front end is PascalCase for components, pages and providers (`SignInPage.tsx`), `useX.ts` for hooks, and kebab-case for everything else, and a component with children becomes a folder of its name whose children share its prefix. Both apps: named exports, no barrels. Each app's `AGENTS.md` names the file to copy.
- `docs/requirements.md` (the rules), `docs/spec/` (the spec, mirrored from its issue), `docs/adr/` (decisions and their reasons), `docs/agents/` (how agents use the tracker and the domain docs).
- [AI.md](AI.md): one entry per ticket of what was AI-generated, what was verified, what was fixed.
- The root `package.json` only delegates into the apps; lint (`npm run lint`) and format (`npm run format:check`) run from the root over both ([ADR 0004](docs/adr/0004-quality-gates-and-test-seams.md)).

## Workflow

All work goes through the skills in this order, and nothing skips a step:

`grill-with-docs` -> `to-spec` -> `to-tickets` -> `implement` -> `code-review` -> `retro`

- **A new decision or new work** starts at `grill-with-docs` (decisions land in `GLOSSARY.md` and `docs/adr/`), then `to-spec`, then `to-tickets`. Tickets are never written by hand.
- **Each ticket** is built with `implement`: take it from the frontier (an open sub-issue of the spec with no open blocker, `docs/agents/issue-tracker.md`), run on its `model:` and `effort:` labels, and use `tdd` at the agreed seams.
- **Red, then green, in git**: a behaviour ticket commits its failing tests first (`test(<scope>): <behaviour> (red)`), then the code that passes them (`feat(<scope>): ... (green)`, ending `Closes #<n>`). A ticket with no new behaviour (tooling, renames, docs) says so in its commit body.
- **Before the ticket lands**, `code-review` runs on its diff against `CODING_STANDARDS.md` and the ticket, and its findings are fixed.
- **When every ticket of a spec has landed**, `code-review` runs on the whole integration branch, then `retro` closes the session.
- A ticket is done when lint, typecheck, tests and build are green for every app it touched and its `AI.md` entry is written.

## Keeping these docs true

- A ticket that adds a folder or a convention updates the nearest `AGENTS.md` (root, app, or `common/` / `database/`) in the same commit.
- An `AGENTS.md` is architecture: what belongs where, the rules that cross files, which file to copy, and what to read next. It points at code and at `CODING_STANDARDS.md` rather than restating them, and lists no files: the folder itself is the inventory.
- A folder gets its own `AGENTS.md` only when it holds architecture the app's file cannot carry in a few lines, as `common/` (shared by every feature) and `database/` (the only door to MongoDB) do; everything else lives in the app's `AGENTS.md`.
- Every `AGENTS.md` has a `CLAUDE.md` beside it containing only `@AGENTS.md`.

## Commits

Conventional Commits; see the `git-conventions` skill.

## Agent skills

### Issue tracker

Specs and tickets are GitHub Issues: the spec is a `spec` issue, its tickets are sub-issues with native "blocked by" links. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.
