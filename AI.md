# AI.md

How AI assistance was used to build this repository, written as the work happened, one entry per ticket.
The assistant was Claude (Claude Code in VS Code). Every generated line was read, run and owned before it was committed.

## Method

The workflow was chosen up front and followed throughout:

1. **Grill with docs.** Instead of prompting "build an auth module", the AI interviewed me in rounds about the design, one numbered question per open decision with its recommended answer. Decisions were written down as they settled: the clarified rules in `docs/requirements.md`, the vocabulary in `GLOSSARY.md`, and the two hard-to-reverse choices as ADRs in `docs/adr/`.
2. **Spec, then tickets.** The conversation was synthesised into `docs/spec/auth-module.md`, then split into eight tracer-bullet tickets in `docs/tickets/`, each a thin end-to-end slice with explicit blocking edges.
3. **Implement one ticket at a time, test first, at agreed seams only.** Three seams were agreed before any test was written: the back end's HTTP API (against a throwaway `mongod`), the front end's rendered app (network faked with MSW), and a small set of Playwright journeys.
4. **Review against written standards.** `CODING_STANDARDS.md` holds the rules a reviewer checks; `AGENTS.md` files hold only navigation pointers.

## What worked

- **Constraining scope with the brief first.** The first planning round jumped straight to technology. I redirected it to the brief's requirements, and the resulting clarifications (what counts as a "special character", whether a name is trimmed before counting, what sign-in reveals) became the testable rules everything else hangs on.
- **"Answer from conventions you already have; ask me only what's left."** Pointing the AI at an existing codebase's conventions (one handler per operation, repositories as the only database door, a closed error-code set with front-end-owned copy) removed most of its questions and produced a more consistent design than open-ended prompting did.
- **ADRs only for the hard-to-reverse.** Two ADRs, not ten: the Session model and the error contract.

## Corrections and decisions made differently

- **Rejected the first scaffold.** An earlier attempt had generated a back end before any design was agreed; it contained a broken Jest config (regexes written as invalid JSON escapes in `package.json`) and a hard-coded, fabricated bcrypt hash used as a timing-attack decoy. I had it deleted and restarted from the requirements.
- **Asked for less, not more.** The AI's first question rounds were long and over-engineered (a Redis-backed grace cache, asymmetric signing keys). I cut them back to what a few-hours brief warrants; the Session model kept rotation and reuse detection but dropped the infrastructure.
- **NestJS 11, not 12.** The newest major had shipped only weeks earlier; I chose the version whose ecosystem (`@nestjs/mongoose`, `nestjs-pino`, `@nestjs/swagger`) is proven, over the newest.
- **scrypt, not argon2id.** argon2id was the AI's recommendation, but its native addon was blocked by Windows Application Control on my machine, as was Rollup's native binary. Password hashing moved to scrypt from `node:crypto` (OWASP-listed, no native dependency, no 72-byte limit like bcrypt), and Vite's Rollup was swapped for its WebAssembly build.

## Log

### Moving the tickets onto GitHub Issues

The tickets started as committed Markdown files. I asked for them to live on the tracker instead, so the work is visible as issues that open and close: the spec is issue #1 and tickets 01-08 are its sub-issues #2-#9, linked with GitHub's native "blocked by" dependencies.

### Restarting the implementation with agents

The first two tickets were implemented by the assistant directly in the main conversation, with tests written alongside the code rather than strictly first. That skipped the agreed workflow: each ticket built by a fresh implementer agent, test-first at the agreed seams, then merged into an integration branch and reviewed. I had all of that code discarded, keeping only the planning documents, and the implementation restarted from issue #2 under `implement-spec`.

What survived from the discarded attempt, because it was learned rather than written:

- Windows Application Control on the development machine blocks unsigned native `.node` addons: password hashing uses scrypt from `node:crypto` (recorded in `CODING_STANDARDS.md`), and Vite's Rollup needs its WebAssembly build (`@rollup/wasm-node` as an npm override).
- Biome needs Tailwind directive parsing enabled for CSS, and a `"//"` comment key is invalid in its configuration; use `biome.jsonc` comments.
- Validation issues on the wire are `{ path, code }` with rule ids as codes (ADR 0002 updated).

### 01: Repository setup (#11)

- **AI-generated:** the root `package.json` (delegating scripts, `concurrently` as the only root dependency), `compose.yaml` for MongoDB 8 with a `mongosh` ping health check, `backend/.env.example` and `frontend/.env.example`, `.gitignore`, `.editorconfig`, and ADR 0003. The env variable names (`ACCESS_TOKEN_TTL_SECONDS`, `SESSION_IDLE_TTL_DAYS`, `SESSION_ABSOLUTE_TTL_DAYS`, `REFRESH_GRACE_SECONDS`, `PASSWORD_HASH_COST`, `COOKIE_SECURE`, `API_PROXY_TARGET`) were chosen here; the spec names the settings, not the variables, and later tickets must read exactly these.
- **Verified:** with throwaway stub `package.json` files in `backend/` and `frontend/` (removed before committing), `npm run setup`, `dev`, `test`, `build` and `typecheck` each ran the matching script inside each app's own directory. `docker compose config` validates the Compose file. There is no test suite: the apps do not exist yet, so no agreed test seam covers this ticket.
- **Not verified:** `docker compose up` itself, because the Docker engine was not running on the development machine during this ticket; the health check is unexercised until it is.

### 02: Code quality gates (#12)

- **AI-generated:** `biome.jsonc` (recommended preset, formatter off, `noConsole` as an error, Nest's parameter decorators, Tailwind directives, `useImportType` off for `backend/`), `.prettierrc.json` and `.prettierignore`, the Husky pre-commit hook with `.lintstagedrc.json`, `.gitattributes` forcing LF, the root `lint`, `lint:fix`, `format`, `format:check` and `prepare` scripts, `.github/workflows/ci.yml`, and ADR 0004. Installed skills under `.claude/skills/` and `.agents/skills/` are excluded from both tools as vendored upstream code.
- **Verified:** a temporary `backend/src/planted.ts` with a `console.log` (deleted, never committed) failed `npm run lint` and `biome ci .`, the command CI runs, before the config existed (no lint script) and after it (`lint/suspicious/noConsole`). Staging it and committing ran the pre-commit hook, which rejected the commit and reverted. `prettier --check .` passes over the repository; the only file it reformatted was the endpoint table in `docs/spec/auth-module.md`. The real commit for this ticket went through the hook.
- **Design choice:** the per-app CI jobs exist now but skip while `backend/package.json` or `frontend/package.json` is absent, so CI is green before #13 and #14 and gates each app from the commit that creates it. Lint runs once from the root for both apps.
- **Not verified:** CI catching the planted violation on GitHub itself; it runs the same `biome ci .` that was run locally. The workflow triggers on pushes to `main` and on pull requests, so a push to a ticket branch alone does not run it.

### 04: Front-end setup (#14)

- **AI-generated:** the `frontend/` app (Vite 7, React 19, TypeScript 5.9, Tailwind 4 through `@tailwindcss/vite`, React Router 7, TanStack Query 5, axios), the `cn()` helper (`clsx` + `tailwind-merge`) used by a CVA `StatusBadge`, the `/api` dev proxy reading `API_PROXY_TARGET` from #11's `.env.example`, the rendered-app harness (`renderApp(path, { handlers })`, an MSW server, a setup file), a placeholder page at `/` that reports `GET /api/health`, a not-found page, `frontend/AGENTS.md`, and ADR 0006. Rollup is overridden with `@rollup/wasm-node`.
- **Verified:** each test was seen failing before its code existed: the placeholder and not-found tests (no app yet), and the harness test (no undeclared-request check yet). MSW's own `onUnhandledRequest: "error"` only rejects the request, which a page can swallow, so the harness records undeclared requests and throws from `afterEach`; temporarily removing a declared handler from a test made that test fail with `Undeclared request: GET /api/health`. `typecheck`, `test` (4 tests), `build` (with the WebAssembly Rollup, on this machine), `biome check .` and `prettier --check .` are green. The dev server was started with `API_PROXY_TARGET` pointing at a stub HTTP server: `/` served the app and `/api/health` reached the stub with its path and `Host` unchanged.
- **Not verified:** the proxy against the real back end (#13 is built in parallel); the Playwright journeys cover that later. `npm audit` flags Vitest 3's `@vitest/mocker` and `tinypool` (dev-only, test runner); the fix is Vitest 5, a major upgrade outside this ticket.
