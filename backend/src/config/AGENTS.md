# backend/src/config/AGENTS.md

The environment: parsed and validated once at boot, then read only through `AppConfigService`. The door is described in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Three doors").

## Conventions

- File names are kebab-case: `app-env.ts` holds the parsing, `app-config.<role>.ts` the Nest pieces, each exporting its PascalCase class.
- One commit adding a variable touches all of: the schema in `app-env.ts`, the `AppConfig` type and its mapping in `parseConfig` (`SCREAMING_SNAKE` variable -> `camelCase` key), `backend/.env.example`, and `testEnv` in `src/test/boot.ts` when tests need a value.
- A rule across variables (one bounded by another, a production-only requirement) goes in the schema's `superRefine`.
- A constant that is not an environment variable stays in the module that uses it.

## Inventory

- `app-env.ts`: the Zod schema over every variable, the typed `AppConfig`, `parseConfig` (names every bad variable at once, never echoes a value), `InvalidConfigError`, and `loadConfig` (the one reader of `process.env`).
- `app-config.service.ts`: `AppConfigService.get(key)`, plus derived flags such as `isProduction`.
- `app-config.module.ts`: `AppConfigModule`, global, built from configuration already parsed in `main.ts`.
