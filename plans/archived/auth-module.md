# Auth Module

- **Status:** Archived
- **Superseded by:** [docs/spec/auth-module.md](../../docs/spec/auth-module.md) and its tickets, GitHub issues #2 to #9
- **Stage:** Superseded before implementation began
- **Owner:** MostafaKh1
- **Branch of record:** `main`
- **Created:** 2026-11-10

---

## Goal

Deliver the brief in [docs/requirements.md](../../docs/requirements.md): Sign up, Sign in, an Application page, Sign out, and a protected endpoint, on React + NestJS + MongoDB, production-ready and inside a few hours.
Vocabulary follows [GLOSSARY.md](../../GLOSSARY.md); the two load-bearing decisions are [ADR 0001](../../docs/adr/0001-session-record-with-short-lived-access-token.md) and [ADR 0002](../../docs/adr/0002-api-errors-carry-codes-not-copy.md).

## Decisions

### Repository

- Two independent apps, `backend/` and `frontend/`, each with its own `package.json` and lockfile; a thin root `package.json` holds git hooks and convenience scripts. No workspace tooling.
- npm, so a reviewer needs nothing beyond Node 22.
- Biome lints, Prettier formats (print width 110, double quotes, trailing commas, tab width 2); Husky + lint-staged run both on pre-commit, lint before format so Prettier has the last word.
- Conventional Commits, one commit per stage.

### Back end

- NestJS 11 on Express 5, MongoDB through Mongoose, reached **only** through injected `UserRepository` and `SessionRepository`.
- One business operation per class, `execute` as its only public method: `SignUpHandler`, `SignInHandler`, `RefreshSessionHandler`, `SignOutHandler`, `GetCurrentUserHandler`. Controllers extract the request and call one handler.
- `AppConfigService` is the only reader of the environment, which is parsed with Zod at boot and crashes the process if invalid.
- Authentication is deny-by-default: a global guard requires a valid access token unless a route is marked `@Public()`.
- Validation is Zod v4 through a small custom pipe (no `nestjs-zod`); OpenAPI request schemas come from `z.toJSONSchema()`.
- Passwords are hashed with **argon2id**, because the 128 character limit in the requirements exceeds bcrypt's 72 byte input.
- Sessions per ADR 0001; errors per ADR 0002.
- Global prefix `/api`.

| Method | Path                 | Access                 | Purpose                                              |
| ------ | -------------------- | ---------------------- | ---------------------------------------------------- |
| POST   | `/api/auth/sign-up`  | Public, throttled      | Create a User and a Session                          |
| POST   | `/api/auth/sign-in`  | Public, throttled      | Create a Session                                     |
| POST   | `/api/auth/refresh`  | Refresh cookie, Origin | Rotate the refresh credential, issue an access token |
| POST   | `/api/auth/sign-out` | Refresh cookie, Origin | End the current Session                              |
| GET    | `/api/users/me`      | **Access token**       | The protected endpoint: the signed-in User's profile |
| GET    | `/api/health`        | Public                 | Liveness and database ping                           |

- Cross-cutting: `nestjs-pino` (JSON logs, a request id per request that is echoed as `traceId` in errors), `helmet`, a CORS allowlist, `@nestjs/throttler` on the auth routes, Swagger UI at `/api/docs`.

### Front end

- React 19 + Vite + TypeScript, React Router, React Hook Form + Zod, axios, TanStack Query, Tailwind 4 + CVA.
- The Session lives in one React context: the access token in memory, restored on boot through `POST /api/auth/refresh`.
- The axios client attaches `Bearer`, and on a `401` runs one shared refresh (concurrent `401`s wait on the same promise), then retries once.
- Routes: `/sign-up`, `/sign-in`, `/` (Application page). Guards redirect per the requirements and return the User to where they were headed.
- The Sign up form shows the password rules as a live checklist; server `issues` land on their fields; error copy is keyed by `code`.
- In development Vite proxies `/api` to the back end, so the browser sees a single origin and the cookie is first-party.

### Testing and delivery

- Back end: a unit suite with no database (handlers, schemas, pipe, filter) and an integration suite of HTTP tests against a throwaway `mongod` from `mongodb-memory-server`.
- Front end: Vitest + Testing Library for the schemas, the forms and the route guards.
- End to end: Playwright drives the real front end against the real back end through Sign up, reload, Sign out and Sign in.
- GitHub Actions runs lint, typecheck, test and build for both apps, then the Playwright suite.
- `compose.yaml` runs the whole stack and `compose.mongo.yaml` only MongoDB; each app ships a Dockerfile.

### Agent and project docs

- Root `AGENTS.md` (overview, commands, rules), `CLAUDE.md` containing only `@AGENTS.md`, and an `AGENTS.md` in each app.
- `plans/README.md`, pointing at the issue tracker.
- Skills in `.claude/skills/`: `git-conventions`, plus `grill-with-docs`, `grilling` and `domain-modeling`.
- `README.md` (how to run, test and work with the repo, plus what is out of scope) and `AI.md`, written one entry per stage.

## Stages

### Stage 1 - Scaffold

- [ ] Root `package.json`, `.gitignore`, `.editorconfig`, Prettier, Biome, Husky + lint-staged
- [ ] `backend/` NestJS skeleton: config, logging, health, error filter
- [ ] `frontend/` Vite + React + Tailwind skeleton
- [ ] `compose.yaml`, `compose.mongo.yaml`, `.env.example` per app
- [ ] `AGENTS.md` files, `CLAUDE.md`, `git-conventions` skill, `AI.md` entry

### Stage 2 - Back end

- [ ] `User` and `Session` schemas, repositories, unique email index, TTL index on Session expiry
- [ ] Zod schemas and validation pipe; error codes and the filter's envelope
- [ ] The five handlers, the auth and users controllers, the global guard and `@Public()`
- [ ] Refresh cookie, rotation, grace window, reuse revocation, Origin check
- [ ] Throttling, helmet, CORS, Swagger
- [ ] Unit and integration suites green; `AI.md` entry

### Stage 3 - Front end

- [ ] API client with single-flight refresh; Session context and boot restore
- [ ] Sign up, Sign in and Application pages; route guards
- [ ] Form validation mirroring the requirements, live password checklist, code-keyed error copy
- [ ] Vitest suite green; `AI.md` entry

### Stage 4 - CI and end to end

- [ ] Dockerfiles
- [ ] GitHub Actions workflow
- [ ] Playwright suite over the full stack, wired into CI
- [ ] `AI.md` entry

### Stage 5 - Docs and submission

- [ ] `README.md`; traceability table in `docs/requirements.md` filled in
- [ ] `AI.md` finalised
- [ ] Push to a public GitHub repository, after explicit approval

## Verification

Every stage ends with lint, typecheck, tests and build green for the apps it touched, then its commit.
