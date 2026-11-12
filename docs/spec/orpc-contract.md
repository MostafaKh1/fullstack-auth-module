# Spec: One shared oRPC contract for both apps

## Problem Statement

The front end and the back end describe the same API twice. The field rules (email, name, password) are written once in each app and kept in step by hand, with their table of worked examples duplicated too; a rule changed in one app and forgotten in the other ships a form that accepts what the API rejects, or the reverse. The routes, their responses and their error codes are described with decorators in the back end and reach the front end only as types generated from an OpenAPI file, so the validation itself is never shared and every change runs through a generate-and-commit loop.

## Solution

The `contract/` folder becomes one shared package, `@app/contract`, written contract first with oRPC: every route's method and path, its input and output schemas, its typed errors, and the one copy of the field rules with their worked examples. The back end implements each route from the contract, and the front end calls it through a typed client built from the same contract, so a rule or a response shape changes in one place and both apps' typechecks follow. On the wire nothing changes: the same REST routes under `/api`, the same refresh cookie, the same error envelope, and the same Swagger page, now generated from the contract (ADR 0012, which supersedes ADR 0003).

## User Stories

1. As a developer, I want the field rules defined once, so that the Sign up form and the API can never disagree about what a valid email, name or password is.
2. As a developer, I want one table of worked examples for the field rules, so that I add an example once and both apps are tested against it.
3. As a developer, I want each route's input and output declared once, so that changing a response shape is one edit that both apps' typechecks follow.
4. As a developer, I want the front end's API calls typed straight from the contract, so that I no longer regenerate and commit types after each back-end change.
5. As a developer, I want each route's error codes declared in the contract, so that the front end knows exactly which codes a call can return.
6. As a back-end developer, I want a controller method to implement one contract procedure, so that the route, its input and its output come from the contract and the method only calls one service.
7. As a back-end developer, I want the access-token guard, the Origin check, the throttler and `@Public()` to keep working as Nest guards, so that the security model is unchanged.
8. As a back-end developer, I want the refresh cookie written with the same attributes as today, so that Sessions behave exactly as ADR 0001 describes.
9. As a back-end developer, I want our JSON body parser and its size limit kept in front of oRPC, so that oversized and malformed bodies still get `request.too_large` and `request.malformed`.
10. As a back-end developer, I want a Zod validation failure answered as `request.validation_failed` with `issues: [{path, code}]` carrying our rule ids, so that the front end's field messages keep working.
11. As a front-end developer, I want one oRPC client built from the contract, so that every call shares the base URL, the Bearer token and the cookie credentials.
12. As a front-end developer, I want TanStack Query options generated from the client, so that queries and mutations are typed without hand-written wrappers.
13. As a front-end developer, I want the access-token refresh and retry kept in one central place in the client, so that no call handles an expired token itself.
14. As a front-end developer, I want typed errors from the client, so that I branch on our error codes without parsing response bodies.
15. As an API consumer who does not use TypeScript, I want the same REST routes, methods and paths, so that my integration keeps working.
16. As an API consumer, I want every error in the envelope of ADR 0002 (`code`, `status`, `traceId`, `retryable`, `issues?`), so that error handling stays the same.
17. As an API consumer, I want the OpenAPI document and Swagger UI at `/api/docs`, so that the API stays documented and explorable.
18. As a reviewer, I want `contract/openapi.json` still generated and checked in CI, so that a change to the public API shows up in the diff.
19. As a maintainer, I want the repository to be one npm workspace with one lockfile, so that the contract package is linked into both apps without publishing it.
20. As a maintainer, I want the contract package compiled before the apps use it, so that the back end's Node and Jest load JavaScript, not TypeScript, from it.
21. As a maintainer, I want `npm run setup`, `npm run dev`, `npm run build`, CI and both Dockerfiles to build the contract first, so that no entry point sees a missing or stale build.
22. As a maintainer, I want every `@orpc/*` package pinned to the same v1 release, so that upgrades are deliberate and the docs I read match the code.
23. As a maintainer, I want the health route moved first, end to end, so that the ES-module and workspace risks are proven or fixed before any auth route moves.
24. As a maintainer, I want the back end switched to ES modules only if loading oRPC from CommonJS fails under Jest or the build, so that the change is no larger than it must be.
25. As a maintainer, I want the `@nestjs/swagger` decorators, the generated front-end types and the hand-written API wrappers removed once nothing uses them, so that nothing describes the API twice.
26. As a maintainer, I want the docs that describe the old arrangement (the field-rules "kept twice" rule, the contract notes, both apps' architecture notes) updated in the same tickets, so that they never contradict the code.
27. As a User, I want Sign up, Sign in, the Application page and Sign out to behave exactly as before, so that the migration is invisible to me.
28. As an operator, I want the production images to build and run as before, so that deployment is unchanged.

## Implementation Decisions

- **The package**: `contract/` becomes the npm workspace package `@app/contract`, private and never published. It holds the oRPC contract router (one contract per feature: health, auth, users), each procedure's REST route, its Zod input and output and its typed errors, the field rules and their worked-examples table. The generated `openapi.json` stays in the same folder.
- **The workspace**: the root becomes an npm workspace of `backend`, `frontend`, `e2e` and `contract`, with one root lockfile; the per-app lockfiles go. The root scripts keep their names.
- **Compiled, not source**: the package compiles with `tsc` to ES modules plus declarations, and its exports point at the build. `setup`, `build`, CI and both Dockerfiles build it first; `dev` runs its compiler in watch mode beside both apps. Both Dockerfiles build from the repository root so they can see it.
- **oRPC version**: every `@orpc/*` package is pinned to exactly 1.16.2, with the Zod v4 JSON-schema converter. The v2 beta is not used.
- **ES modules**: the back end stays CommonJS and loads oRPC through Node's `require()` of ES modules (Node 22.12+). If that fails under Jest, `ts-node` or the build, the tracer ticket switches the back end to ES modules.
- **The wire**: procedures declare REST routes with today's methods and paths, relative to the `api` prefix. Only oRPC's OpenAPI codec is used, never its RPC protocol. The refresh cookie's path, the dev and nginx proxies and the throttler's per-route counters are unchanged.
- **The back end**: each controller method implements one procedure with `@Implement` and calls one service method, as ADR 0010 requires. The global access-token guard, `@Public()`, `OriginCsrfGuard` and `ThrottlerGuard` stay on those methods. Request headers and cookies reach the handler through the oRPC context. The refresh cookie is written by `AuthCookiesService` through oRPC's response-headers plugin with unchanged attributes. Our JSON body parser stays in front of oRPC.
- **Errors**: the ADR 0002 envelope stays on the wire. oRPC's error body encoder writes `{code, status, traceId, retryable, issues?}`. Our error codes are oRPC typed errors in the contract. A Zod input failure maps to `request.validation_failed` with `issues: [{path, code}]` carrying the rule ids. The global Nest exception filter still writes the envelope for errors raised outside a procedure (guards, the body parser), because an oRPC error never reaches it.
- **API docs**: oRPC's `OpenAPIGenerator` builds the document from the contract, written to `contract/openapi.json` by a script with no server and no database. The same document is served through Swagger UI at `/api/docs` by the back end's existing Swagger UI setup, not by oRPC's reference plugin. The document describes the error envelope and the cookie and bearer security. CI keeps failing on a stale `openapi.json`.
- **The front end**: one oRPC client built from the contract with oRPC's OpenAPI link. Its base URL is `/api`, it sends credentials so the refresh cookie travels, and it adds the in-memory access token as a Bearer header. The access-token refresh and single retry stay one central piece, in the client or a link interceptor. The error decoder turns the envelope back into typed errors. Queries and mutations use oRPC's TanStack Query helpers. The generated API types and the per-feature API wrappers are removed.
- **Field rules**: the one copy in the contract replaces both apps' copies. The front end's forms and the back end's input schemas both use it, and the worked-examples table runs in both apps' suites.
- **Removed once unused**: the `@nestjs/swagger` route decorators and the per-route API-error decorator, the `openapi-typescript` generation, and the duplicated field-rules files and their duplicated examples.
- **Order**: the health route moves first, end to end, as a tracer. Then the field rules and the auth routes, then the users route, then the front-end client.
- **Docs**: ADR 0012 records the decision. ADR 0003 is marked superseded, and ADRs 0005 and 0010 are amended. The architecture notes for both apps and for `contract/`, the field-rules rule in the coding standards, and the README are updated in the ticket that changes the code they describe. No new glossary term.

## Testing Decisions

- A good test checks behaviour at the outermost seam, through real HTTP requests, the rendered app or a real browser, never oRPC's internals or how a controller is wired. oRPC's `call()` runs a procedure without the Nest guards, so it is not a seam here.
- **The back-end seam**: the existing suites that boot the real application and talk to it over HTTP against a throwaway MongoDB. They are the migration's safety net. They must pass after every ticket with no change to the behaviour they assert. A suite may change only where it reads something that moved, such as where the examples table is imported from.
- **The front-end seam**: the whole rendered app with its real router and providers, the network faked by MSW. The routes keep their paths, so MSW intercepts the oRPC client's requests as it does today.
- **The browser journeys**: the Playwright journeys must pass after the tracer ticket and after the last ticket.
- **Red first only for new behaviour**: moving a route onto the contract changes no behaviour, so those tickets are refactors with no red commit, and each says so in its commit body. Red commits are written for:
  - both apps' suites running the one shared table of worked examples;
  - the envelope produced through oRPC's encoder for a validation failure and a typed error.
- **The contract check**: the existing check that `openapi.json` matches what the code generates now runs against oRPC's generator. The old check on generated front-end types goes away with them.
- **Prior art**:
  - the health suite, for a route through the HTTP seam;
  - the API docs suite, which validates real responses against the document;
  - the Sign up page test, for the forms against MSW;
  - the shared worked-examples table, for the field rules.

## Out of Scope

- oRPC's RPC protocol, or any change to routes, methods, paths, status codes or the error envelope.
- oRPC v2.
- New routes or new behaviour for Users or Sessions.
- Replacing NestJS, Express, Mongoose, TanStack Query or React Hook Form.
- Publishing `@app/contract` to a registry.
- Turborepo, Nx, pnpm or any tool beyond npm workspaces.

## Further Notes

- This work starts after the take-home task is submitted. ADR 0012 and its amendments are written but stay off `main` until the oRPC branch starts, and land as that branch's first commit.
- The tracer ticket is the one place this plan can fail. If the back end cannot load oRPC under Jest or the build even after switching to ES modules, stop and reopen ADR 0012 before moving any auth route.
