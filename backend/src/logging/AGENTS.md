# backend/src/logging/AGENTS.md

pino through `nestjs-pino`: one JSON line per event, the request id on every line, secrets redacted by one list. The rules for log calls are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Logging").

## What is here

- `logging.module.ts`: the global module and `REDACTED_PATHS`. A new secret-bearing field name is added to that list, never masked by hand at the call site.
- `request-id.ts`: `assignRequestId`, which reuses a short plain `X-Request-Id` or mints a UUID, and echoes it. The same id is the error envelope's `traceId`.

To log, inject `PinoLogger` from `nestjs-pino` and call `setContext(ClassName.name)` in the constructor, as `src/errors/api-exception.filter.ts` does. Event names are dotted: `request.failed`, `config.invalid`.
