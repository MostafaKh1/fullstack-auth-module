# One shared oRPC contract package in an npm workspace

The two apps now share one package, `@app/contract`, which is the `contract/` folder itself, written contract first with oRPC: every route's method and path, its Zod input and output, and its typed errors, plus the one copy of the field rules and their worked examples. The back end implements each procedure with `@orpc/nest` (`@Implement`) and the front end calls it through oRPC's typed client and its TanStack Query helpers, so a rule or a response shape changes in one place and both apps' typechecks follow. This supersedes ADR 0003: sharing the validation is worth a workspace, where generating types from OpenAPI shared only the shapes and left the rules kept twice.

The repository becomes one npm workspace (`backend`, `frontend`, `e2e`, `contract`) with one root lockfile. The package is compiled with `tsc` to `dist/` (ESM and declarations) and the apps consume the build, because the back end's Node and Jest cannot run TypeScript from `node_modules`; `setup`, `dev`, `build`, CI and both Dockerfiles (built from the repository root) build it first. Every `@orpc/*` package is pinned to the same v1 release (1.16.2); v2 was in beta and renames options.

What stays on the wire is unchanged: plain REST routes under `/api` with their existing methods and paths (oRPC's OpenAPI codec, never its RPC protocol), so the refresh cookie's `Path=/api/auth`, the proxies, the throttler's per-route counters and the browser journeys are untouched. Errors keep the envelope of ADR 0002: oRPC's error body encoder writes `{code, status, traceId, retryable, issues?}` with our codes and rule ids, the client's decoder reads it, and a Zod failure is mapped to `request.validation_failed` with `issues: [{path, code}]`. Guards stay Nest guards on the `@Implement` methods (`AccessTokenGuard`, `OriginCsrfGuard`, `ThrottlerGuard`, `@Public()`); the refresh cookie is written through oRPC's response headers; our JSON body parser and its limit stay in front of oRPC's. `openapi.json` stays in the same folder as the package's generated output, and Swagger UI at `/api/docs` remains, both generated from the contract by oRPC's `OpenAPIGenerator` instead of the Nest decorators.

## Considered options

- **Keep the apps independent (ADR 0003).** No workspace, but the field rules and their examples stay duplicated and change in two places.
- **Share the Zod schemas only.** Removes the duplicated rules for about a fifth of the work, but the routes, responses and errors would still be described twice (decorators and generated types).
- **tRPC.** Its own RPC protocol on the wire instead of REST, so the public, Swagger-documented API and the existing routes would go.
- **oRPC v2.** The current docs describe it, but it was in beta; v1 is the stable line.

## Consequences

- The back end is ES modules, because oRPC ships only ES modules and Jest supports `require(esm)` only from Node 24.9: its Jest runs with `--experimental-vm-modules`, and plain Node runs its sources through ts-node's ES-module loader.
- One lockfile hoists both apps' toolchains together (Jest and ts-jest beside Vite and Vitest); a conflict is fixed in the workspace, not by splitting it again.
- An oRPC error never reaches Nest's exception filters, so the envelope is written in two places: the global filter for everything outside a procedure, the encoder for errors inside one. Both are tested through the HTTP seam.
- Testing a procedure with oRPC's `call()` skips the Nest guards, so the HTTP seam (ADR 0004) stays the only back-end test seam.
