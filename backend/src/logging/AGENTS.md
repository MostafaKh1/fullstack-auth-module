# backend/src/logging/AGENTS.md

pino through `nestjs-pino`: one JSON line per event, the request id on every line, secrets redacted by one list. The rules for log calls are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Logging").

## Conventions

- File names are kebab-case; the module is `logging.module.ts`, a helper is named for what it does (`request-id.ts`).
- A new secret-bearing field name is added to `REDACTED_PATHS`, never masked by hand at the call site.
- To log, inject `PinoLogger` from `nestjs-pino` and call `setContext(ClassName.name)` in the constructor, as `src/common/all-exceptions.filter.ts` does. Event names are dotted: `request.failed`, `config.invalid`.

## Inventory

- `logging.module.ts`: `LoggingModule`, global, and `REDACTED_PATHS`.
- `request-id.ts`: `assignRequestId`, which reuses a short plain `X-Request-Id` or mints a UUID, and echoes it. The same id is the error envelope's `traceId`.
