# backend/src/config/AGENTS.md

The environment: parsed and validated once at boot, then read only through `AppConfigService`. The door is described in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Three doors").

## What is here

- `config.schema.ts`: the Zod schema over every variable, the typed `AppConfig`, `parseConfig` (names every bad variable at once, never echoes a value) and `loadConfig` (the one reader of `process.env`).
- `app-config.service.ts`: `AppConfigService.get(key)`, plus derived flags such as `isProduction`.
- `app-config.module.ts`: the global module, built from configuration already parsed in `main.ts`.

## Adding a variable

One commit touches all of: the schema, the `AppConfig` type and its mapping in `parseConfig` (`SCREAMING_SNAKE` variable -> `camelCase` key), `backend/.env.example`, and `testEnv` in `test/support/test-app.ts` when tests need a value.
A rule across variables (one bounded by another, a production-only requirement) goes in the schema's `superRefine`.

A constant that is not an environment variable stays in the module that uses it.
