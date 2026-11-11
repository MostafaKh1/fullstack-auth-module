# Two independent npm apps under a thin root, without workspace tooling

The repository holds two apps, `backend/` (NestJS) and `frontend/` (React), each with its own `package.json`, its own `package-lock.json` and its own `node_modules`, installed and run on its own with npm.
The root `package.json` holds only shared tooling and convenience scripts that delegate into the apps with `npm --prefix <app>`: `setup` runs `npm ci` in the root and in each app; `dev` runs both apps' `dev` scripts side by side (through `concurrently`); `typecheck`, `test` and `build` run each app's script of the same name in turn; `db:up` starts the local MongoDB from `compose.mongo.yaml`, which `compose.yaml` includes.
Every app therefore owes the root a `dev`, `typecheck`, `test` and `build` script; the root scripts fail until both apps exist and provide them.

The two apps share no code: the only contract between them is HTTP, and the field rules are duplicated on purpose as one table of worked examples in each app.
With nothing to share, a workspace buys hoisting and a single lockfile at the cost of dependency conflicts between two unrelated toolchains (Nest's Jest and ts-jest against Vite and Vitest), and each app's Dockerfile would need the whole workspace to install.
Keeping the apps independent means each one can be cloned out, containerised and upgraded alone.

## Considered options

- **npm, pnpm or Yarn workspaces.** One install and one lockfile, but they hoist and link packages across apps that share nothing, and they make each Dockerfile depend on the root.
- **Turborepo or Nx.** Task caching and a dependency graph are worth it for many packages; for two that never import each other they are configuration without payoff.
- **pnpm or Yarn instead of npm.** Faster installs and stricter resolution, but npm ships with Node, so a reviewer needs nothing beyond Node to install and run the project, and CI needs no extra setup step.

## Consequences

- A dependency both apps use (TypeScript, Zod) is declared and upgraded twice.
- Installing is three `npm ci` runs, wrapped by `npm run setup`. The browser journeys (ADR 0004) add a third, tool-only package in `e2e/`, installed and locked on its own for the same reasons; it holds no application code.
