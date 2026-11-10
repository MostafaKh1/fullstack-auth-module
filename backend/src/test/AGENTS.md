# backend/src/test/AGENTS.md

The back end's only test seam: the real application over HTTP against a throwaway MongoDB ([ADR 0004](../../../docs/adr/0004-quality-gates-and-test-seams.md)). The rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Tests"). Jest runs `src/test/**/*.spec.ts`; `tsconfig.build.json` excludes this folder, so none of it ships.

## Where does this file belong?

1. Behaviour of a route or module -> `<area>.spec.ts` here (kebab-case), named for what it covers (`health.spec.ts`, `sign-up.spec.ts`). No spec sits beside source.
2. Boot-time behaviour of the real entry point -> `configuration.spec.ts`, which spawns `src/main.ts`.
3. A helper more than one spec uses -> `support/<name>.ts` (kebab-case).
4. A change to how the app boots under test -> `boot.ts`.

## Writing a spec

- `startTestApp(env?)` in `beforeAll` and `app.close()` in `afterAll`, once per file. It boots `AppModule` exactly as production does and gives `http()` (supertest), `clock` (a `FakeClock`), `startedAt` (where the clock started), `db` (the raw database for seeding and inspecting), `logs()` (every log line written) and `stopDatabase()`.
- Seed and inspect through `app.db`, never through the repository under test. Clear the collections a spec writes to between examples: several worked examples normalise to the same email.
- Move time with `app.clock.set()` and `advance()`, from `app.startedAt`. The clock starts at the real current time, because MongoDB's TTL monitor deletes Sessions whose idle expiry has passed in real time. Expected dates are `app.startedAt` plus the spec's durations.
- Pass `{ PASSWORD_HASH_COST: "10" }` to `startTestApp` when a file signs up many Users and is not testing the hash itself.
- Canonical example: `health.spec.ts`. `harness.spec.ts` pins the harness itself.

## Inventory

- `configuration.spec.ts`, `errors-and-request-id.spec.ts`, `harness.spec.ts`, `health.spec.ts`, `logging.spec.ts`, `sign-up.spec.ts`, `sign-in.spec.ts`, `current-user.spec.ts` (the protected endpoint and the guard), `refresh.spec.ts` (rotation, the grace window, replay, expiry, the `Origin` check).
- `boot.ts`: the harness (`startTestApp`, `testEnv`, `TestApp`, `LogLine`).
- `support/fake-clock.ts` (`FakeClock`), `support/refresh-cookie.ts` (`refreshCookie`, the refresh cookie's `Set-Cookie` line).
- `support/field-rules.examples.ts`: the worked examples of the field rules. The front end keeps an identical copy (`AuthScreenFieldRules.examples.ts`); change a row in both.

The first run downloads a `mongod` binary into `~/.cache/mongodb-binaries`, shared by every checkout.
