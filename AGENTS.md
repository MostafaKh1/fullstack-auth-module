# AGENTS.md

Sign up / Sign in module: a React front end (`frontend/`) and a NestJS + MongoDB back end (`backend/`), as two independent npm apps under a thin root ([ADR 0003](docs/adr/0003-two-npm-apps-without-workspace-tooling.md)).

## Before you change anything

- Read [GLOSSARY.md](GLOSSARY.md) and name things with its terms.
- Read the ADRs in [docs/adr/](docs/adr/) that touch the area you are in; surface a contradiction instead of overriding it.
- The brief and its clarified rules are [docs/requirements.md](docs/requirements.md); they win over anything else.
- Read the `AGENTS.md` of the app you are editing, then the one in the folder you are editing: each names what belongs there and where a new file goes.
- Write and review code against [CODING_STANDARDS.md](CODING_STANDARDS.md): architecture, errors, logging, secrets, tests.

## How the two apps meet

The apps share no code; HTTP is the only contract between them.

- **The API contract** is the "API contract" table in [docs/spec/auth-module.md](docs/spec/auth-module.md): every route under `/api`, every error as the envelope of [ADR 0002](docs/adr/0002-api-errors-carry-codes-not-copy.md). A new error code or rule id lands in both apps in the same commit.
- **The dev proxy**: Vite forwards `/api` to the back end (`API_PROXY_TARGET`, read in `frontend/vite.config.ts`), so the browser sees one origin in development, as it does behind a reverse proxy in production.
- **The Session cookie**: the refresh credential travels in an `httpOnly` cookie scoped to `/api/auth`; the access token lives only in front-end memory ([ADR 0001](docs/adr/0001-session-record-with-short-lived-access-token.md)). The one-origin proxy is what makes the cookie and the `Origin` check behave the same in both environments.
- **The field rules** exist once per app, each copy pointing at the other ([CODING_STANDARDS.md](CODING_STANDARDS.md), "Validation rules").

## Where things are

- [backend/AGENTS.md](backend/AGENTS.md) and [frontend/AGENTS.md](frontend/AGENTS.md): each app's architecture, and a pointer to every folder-level `AGENTS.md` in it.
- `docs/requirements.md` (the rules), `docs/spec/` (the spec, mirrored from its issue), `docs/adr/` (decisions and their reasons), `docs/agents/` (how agents use the tracker and the domain docs).
- [AI.md](AI.md): one entry per ticket of what was AI-generated, what was verified, what was fixed.
- The root `package.json` only delegates into the apps; lint (`npm run lint`) and format (`npm run format:check`) run from the root over both ([ADR 0004](docs/adr/0004-quality-gates-and-test-seams.md)).

## Workflow

Work flows spec -> tickets -> implementation -> review, one ticket at a time, test first.
Take the next ticket from the frontier: an open sub-issue of the spec with no open blocker (`docs/agents/issue-tracker.md`).
Review is the `code-review` skill, against `CODING_STANDARDS.md` and the ticket.
A ticket is done when lint, typecheck, tests and build are green for every app it touched, its `AI.md` entry is written, and it lands as one commit whose message carries `Closes #<n>`.

## Keeping these docs true

- A ticket that adds a folder or a convention updates the nearest `AGENTS.md` (root, app or folder) in the same commit; a new architecturally significant folder gets its own `AGENTS.md`, linked from its app's.
- An `AGENTS.md` is navigation: what belongs here, where a new file goes, how it is named, which file to copy. It points at code and at `CODING_STANDARDS.md` rather than restating them.
- Every `AGENTS.md` has a `CLAUDE.md` beside it containing only `@AGENTS.md`.

## Commits

Conventional Commits; see the `git-conventions` skill.

## Agent skills

### Issue tracker

Specs and tickets are GitHub Issues: the spec is a `spec` issue, its tickets are sub-issues with native "blocked by" links. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.
