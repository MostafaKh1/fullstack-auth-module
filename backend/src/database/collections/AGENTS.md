# backend/src/database/collections/AGENTS.md

One file per MongoDB collection: its document type, its Mongoose schema and its indexes. Only repositories import from here.

## Conventions

- `<entity>.collection.ts` (kebab-case, singular) exports `<Entity>Document` (the stored shape), `<ENTITY>_MODEL` (the model name) and `<entity>Schema`; register a new one in `../persistence.module.ts`.
- An index (the unique email, the Session expiry) is declared on the schema.
- Secret fields (`passwordHash`, `secretHash`) are `select: false`, so every default projection leaves them out.
- Canonical example: `user.collection.ts`.

## Inventory

- `user.collection.ts`: `UserDocument`, `USER_MODEL`, `userSchema` (unique email, `passwordHash` unselected).
- `session.collection.ts`: `SessionDocument`, `RevokedReason`, `SESSION_MODEL`, `sessionSchema` (the Session record of ADR 0001: secret hashes unselected, a TTL index on `idleExpiresAt`).
