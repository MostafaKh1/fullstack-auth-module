# backend/src/clock/AGENTS.md

`Clock` (`clock.ts`), the application's only source of the current time, provided globally by `clock.module.ts`.

Code that needs "now" injects `Clock` and calls `now()`; a pure `*.rules.ts` function takes `now` as an argument instead.
Tests replace it with `FakeClock` (`test/support/fake-clock.ts`), so expiry and grace windows are tested by moving time, not by waiting.
Durations and lifetimes are configuration (`src/config/`), not constants here.
