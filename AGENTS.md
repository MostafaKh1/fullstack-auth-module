# AGENTS.md

Sign up / Sign in module: a React front end (`frontend/`) and a NestJS + MongoDB back end (`backend/`), as two independent npm apps.

## Before you change anything

- Read [GLOSSARY.md](GLOSSARY.md) and name things with its terms.
- Read the ADRs in [docs/adr/](docs/adr/) that touch the area you are in; surface a contradiction instead of overriding it.
- The brief and its clarified rules are [docs/requirements.md](docs/requirements.md); they win over anything else.
- Each app has its own `AGENTS.md` with its conventions; read it before editing that app.
- Write and review code against [CODING_STANDARDS.md](CODING_STANDARDS.md): architecture, errors, logging, secrets, tests.

## Workflow

Work flows spec -> tickets -> implementation, one ticket at a time, test first.
Take the next ticket from the frontier: an open sub-issue of the spec with no open blocker (`docs/agents/issue-tracker.md`).
A ticket is done when lint, typecheck, tests and build are green for every app it touched, and it lands as one commit whose message carries `Closes #<n>`.

## Commits

Conventional Commits; see the `git-conventions` skill.

## Agent skills

### Issue tracker

Specs and tickets are GitHub Issues: the spec is a `spec` issue, its tickets are sub-issues with native "blocked by" links. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.
