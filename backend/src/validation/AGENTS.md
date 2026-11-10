# src/validation/AGENTS.md

`ZodBodyPipe(schema)`: parses a request body and answers `400 request.validation_failed` with `{ path, code }` issues (ADR 0002), or `400 request.malformed` for a body that is not a JSON object.

- Give every check in a schema its rule id as the error (`.max(254, "email.too_long")`); the pipe copies that text into `code` as is.
