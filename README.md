# Sign up / Sign in module

A complete authentication module: a React front end where a User signs up, signs in, sees the Application page and signs out, and a NestJS + MongoDB back end that issues and protects the Sessions behind it. It answers the brief in [docs/requirements.md](docs/requirements.md), which also holds the clarified rules and a table mapping every requirement to its code and tests.

- **Front end** (`frontend/`): React 19, TypeScript, Vite, React Router, TanStack Query, React Hook Form with Zod, Tailwind.
- **Back end** (`backend/`): NestJS 11, MongoDB through Mongoose, Zod, pino logging, oRPC, Swagger UI.
- **Quality**: three test seams (back-end HTTP, rendered front end, browser journeys), Biome and Prettier gates, CI, Docker images and a Compose stack.

The repository is one npm workspace with one lockfile: the two apps, the browser journeys in `e2e/`, and `contract/`, the package `@app/contract` that holds the API contract written with oRPC, which the back end implements ([ADR 0012](docs/adr/0012-shared-orpc-contract-in-an-npm-workspace.md)). At runtime HTTP is the only link between the apps.

## Prerequisites

- Node.js 22.12 or later (CI and the Docker images use 22).
- Docker, for the Compose stack or for the local MongoDB. The browser journeys alone do not need it.

## Quick start

### With Docker

Compose needs a signing secret for the access tokens and a password for MongoDB; it refuses to start without either. Put random ones in a `.env` file at the repository root, which Compose reads and git ignores:

```sh
{ echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)"; echo "MONGO_PASSWORD=$(openssl rand -hex 32)"; } > .env
docker compose up --build
```

Open http://localhost:8080. This builds both apps, starts MongoDB, the API and an nginx that serves the front end and proxies `/api`. The stack's MongoDB publishes no port and requires that password; the API reaches it over the stack's internal network, with the user `auth` (set `MONGO_USER` to change it). It uses its own volume, so a development database volume created without a password is untouched and needs no reset. MongoDB keeps the first password in its volume, so after changing `MONGO_PASSWORD` run `docker compose down --volumes` to start afresh (this deletes the stack's data).

Deploying behind a reverse proxy: set `TRUST_PROXY` to the real number of proxy hops in front of the API, or throttling counts the proxy instead of the client.

The stack runs with `NODE_ENV=production`, so the refresh cookie is `Secure`. Chrome and Firefox accept a `Secure` cookie on plain-HTTP `localhost`; Safari does not, so in Safari the Compose stack signs you in but a reload signs you out. Use Chrome or Firefox, or the development setup below, which does not set `Secure`.

### Without Docker for the apps

```sh
npm run setup                                  # installs the whole workspace and builds the contract package
cp backend/.env.example backend/.env           # local defaults; every variable is documented inside
cp frontend/.env.example frontend/.env
npm run db:up                                  # MongoDB alone, from compose.mongo.yaml: no password, reachable from this machine only
npm run dev                                    # back end, front end and the contract's compiler together
```

Stop the database with `npm run db:down`. If port 27017 is taken on your machine, set `MONGO_PORT` (for example `MONGO_PORT=27117 npm run db:up`) and use the same port in `MONGODB_URI`.

### URLs

| What               | Development                      | Docker Compose                   |
| ------------------ | -------------------------------- | -------------------------------- |
| The application    | http://localhost:5173            | http://localhost:8080            |
| Health check       | http://localhost:5173/api/health | http://localhost:8080/api/health |
| API docs (Swagger) | http://localhost:3000/api/docs   | http://localhost:8080/api/docs   |

In development Vite proxies `/api` to the back end (`API_PROXY_TARGET`), so the browser sees one origin, as it does behind nginx in Compose. Sign in and Sign up are `/?auth=sign-in` and `/?auth=sign-up` ([ADR 0009](docs/adr/0009-auth-forms-addressed-by-search-parameter.md)).

## Tests and checks

| What                                         | Command                                                              | Needs                                                |
| -------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| Back end (HTTP tests against a throwaway DB) | `npm test -w backend`                                                | nothing: it downloads a `mongod` binary on first run |
| Front end (rendered app, network faked, MSW) | `npm test -w frontend`                                               | nothing                                              |
| Both unit-level suites                       | `npm test`                                                           | nothing                                              |
| Browser journeys (real Chromium, both apps)  | `cd e2e && npx playwright install chromium` once, then `npm run e2e` | nothing else: it starts a throwaway `mongod`         |
| Lint (Biome) and format (Prettier)           | `npm run lint`, `npm run format:check`                               | nothing                                              |
| Types and production builds                  | `npm run typecheck`, `npm run build`                                 | nothing                                              |
| API contract is current                      | `npm run openapi:check -w backend`                                   | nothing                                              |

The apps use the contract package's build: `npm run setup` and the root scripts build it first; after changing it outside `npm run dev`, run `npm run build -w contract` before a `-w` command. Set `E2E_MONGODB_URI` to use an existing MongoDB instead of the throwaway one ([e2e/AGENTS.md](e2e/AGENTS.md)). CI runs all of the above, then builds the images and waits for the containers' health checks ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Project layout

```
backend/     NestJS API: features/ (auth, users, health), common/ (guards, filters, services), core/ (the clock),
             database/ (collections, repositories), config/, logging/, docs/, test/ (HTTP tests)
frontend/    React app: pages/, components/, providers/ (the Session), hooks/, utils/ (API client), tests/ (harness)
e2e/         Playwright journeys, run against the real apps
contract/    @app/contract, the oRPC contract both apps build from, and openapi.json, generated from it
docs/        requirements.md (rules and traceability), spec/, adr/ (decisions), agents/
compose.yaml MongoDB (authenticated, unpublished), API and front end as containers; compose.mongo.yaml is the development database
AI.md        how AI was used; AGENTS.md files hold the navigation for people and agents
```

Each app's architecture and the "where does this file go" rules are in [backend/AGENTS.md](backend/AGENTS.md) and [frontend/AGENTS.md](frontend/AGENTS.md); the standards a reviewer checks are in [CODING_STANDARDS.md](CODING_STANDARDS.md), the vocabulary in [GLOSSARY.md](GLOSSARY.md).

## API summary

Every route sits under `/api`. Swagger UI at `/api/docs` documents each route, its schemas and its error codes, and can call the protected endpoint with a Bearer token; the same document is checked in as [contract/openapi.json](contract/openapi.json).

| Method | Path             | Auth                              | Purpose                                               |
| ------ | ---------------- | --------------------------------- | ----------------------------------------------------- |
| POST   | `/auth/sign-up`  | Public, throttled                 | Create a User and start a Session                     |
| POST   | `/auth/sign-in`  | Public, throttled                 | Start a Session                                       |
| POST   | `/auth/refresh`  | Refresh cookie, Origin, throttled | Rotate the refresh credential, issue an access token  |
| POST   | `/auth/sign-out` | Refresh cookie, Origin            | End the Session on the server                         |
| GET    | `/users/me`      | Access token                      | The protected endpoint: id, email, name, sign-up date |
| GET    | `/health`        | Public                            | Liveness and database status                          |

Every error is one envelope, `{ code, status, traceId, retryable, issues? }`, with a stable code and no display copy; the front end owns the wording ([ADR 0002](docs/adr/0002-api-errors-carry-codes-not-copy.md)). `traceId` is also the `X-Request-Id` header.

## Security notes

- **Passwords** are hashed with scrypt from Node's `node:crypto`, with the parameters and salt stored in the hash; Sign in also verifies a decoy hash for an unknown email so timing does not reveal which emails have a User ([ADR 0007](docs/adr/0007-password-hashing-with-scrypt.md)).
- **Sessions** are server-side records. A 15-minute access token lives only in front-end memory; the refresh credential rotates on every use, and presenting an old one outside a short grace window is treated as replay and revokes the Session ([ADR 0001](docs/adr/0001-session-record-with-short-lived-access-token.md)).
- **The refresh cookie** is `httpOnly`, `SameSite=Lax`, `Secure` in production and scoped to `/api/auth`, so scripts cannot read it and it travels nowhere else ([ADR 0001](docs/adr/0001-session-record-with-short-lived-access-token.md)).
- **Origin check**: the cookie routes (`refresh`, `sign-out`) reject a request whose `Origin` is not on the allowlist, which stops cross-site use of the cookie ([ADR 0001](docs/adr/0001-session-record-with-short-lived-access-token.md)).
- **Sign in never says which half was wrong**: one message, "Invalid email or password". A taken email on Sign up is reported plainly; throttling is the mitigation ([docs/requirements.md](docs/requirements.md)).
- **Throttling, helmet, CORS, body cap**: Sign up, Sign in and refresh are limited per IP (set `TRUST_PROXY` to the number of proxies in front); `helmet` sets the security headers; CORS allows only the configured origins, with credentials; request bodies are capped (`REQUEST_BODY_LIMIT`). See "API contract" in [docs/spec/auth-module.md](docs/spec/auth-module.md) and `backend/src/test/hardening.spec.ts`.
- **`returnTo`** is followed only when it is a same-site path, so Sign in cannot be used as an open redirect ([ADR 0009](docs/adr/0009-auth-forms-addressed-by-search-parameter.md)).
- **Logs** are structured (pino), carry the request id, and redact credentials and cookies; configuration errors name the bad variable and never print its value.

## Out of scope

Email verification, password reset, "remember me", social sign-in, a signed-in-devices list and account deletion, by choice ([docs/requirements.md](docs/requirements.md)). Screenshots are not included.

## How the work was done

The work flowed spec, then tickets, then implementation, then review, one ticket at a time and test first: `docs/spec/auth-module.md` is mirrored from the spec issue (#10) on GitHub, its tickets are sub-issues with native "blocked by" links, and each ticket landed as a commit that closes its issue (behaviour tickets after a red test commit). Review is checked against [CODING_STANDARDS.md](CODING_STANDARDS.md); decisions that are hard to reverse are in [docs/adr/](docs/adr/). The agent workflow is in [AGENTS.md](AGENTS.md).

Every ticket names the model and reasoning effort its implementer runs on, as a `model:` and an `effort:` label; the rules are in [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md#model-and-effort-per-ticket).

How AI was used, what it got wrong and where judgement overrode it is in [AI.md](AI.md).
