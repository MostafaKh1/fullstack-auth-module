# contract/AGENTS.md

`openapi.json` is the contract between the two apps: every route under `/api`, its request schema, its success response and its error codes ([ADR 0002](../docs/adr/0002-api-errors-carry-codes-not-copy.md)). It is generated, never edited by hand.

## How it is made

- The back end describes its routes with Swagger decorators on the controllers and builds the document in `backend/src/docs/api-document.ts`; the request schemas come from the Zod schemas in `auth.types.ts` through `z.toJSONSchema()`. Swagger UI serves the same document at `/api/docs`.
- `npm run openapi --prefix backend` writes `openapi.json`. It needs no database.
- The front end's request and response types are generated from it: `npm run generate:api --prefix frontend` writes `frontend/src/utils/api-types.generated.ts`. The `*-api.ts` modules alias those types; do not hand-write a duplicate.

## Changing the contract

1. Change the controller, its decorators or the Zod schema in the back end, test first.
2. Run `npm run openapi --prefix backend`, then `npm run generate:api --prefix frontend`, and fix whatever the front end's typecheck now reports.
3. Commit `openapi.json` and the generated types with the change.

A back-end test and the `contract` job in CI fail when `openapi.json` differs from what the back end generates, or the generated types differ from `openapi.json`.
