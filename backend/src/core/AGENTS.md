# backend/src/core/AGENTS.md

Injectable providers of things outside the process: the time today, and any external client later. `CoreModule` is global, so a provider here is injectable everywhere without an import.

## Where does this file belong?

1. A wrapper over something the tests must control or replace (the time, an email sender, a third-party API client) -> `<name>.service.ts` here exporting `<Name>Service`, listed in `core.module.ts`'s `providers` and `exports`.
2. A value from the environment it needs -> inject `AppConfigService`; a duration or lifetime is configuration (`src/config/`), not a constant here.
3. Logic that decides something about the domain -> the service of its module, not here.

## Conventions

- One provider per file, the only file that imports its library or reads its global.
- A service that needs "now" injects `ClockService` and calls `now()`; a pure function takes `now` as an argument instead. Controllers never inject it.
- Tests replace a provider with `overrideProvider` in `src/test/boot.ts` (`FakeClock` for `ClockService`), so expiry and grace windows are tested by moving time, not by waiting.
- Canonical example: `clock.service.ts`.

## Inventory

- `core.module.ts`: `CoreModule`, global.
- `clock.service.ts`: `ClockService`, the application's only source of the current time.
