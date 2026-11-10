# backend/src/database/repositories/AGENTS.md

The only door to the collections: every query and write in the back end is a method here.

## Conventions

- `<entity>.repository.ts` (kebab-case) exports `<Entity>Repository`, an `@Injectable()` that injects its model (or the connection) and nothing else: no `AppConfigService`, no `ClockService`, no other repository. Values such as `now` arrive as arguments. Register it in `../persistence.module.ts`.
- A method is named for what the caller needs (`findByEmail`) and returns the repository's own plain type (`User`, `Session`), never a Mongoose document, and never a secret hash unless its name says so (`findWithPasswordHashByEmail`), selecting that field explicitly.
- A repository over a collection with indexes waits for them in `onModuleInit`, so a unique index holds from the first request.
- Canonical example: `database-health.repository.ts` (injects the connection, answers one question, hides the driver); `user.repository.ts` for a collection.

## Inventory

- `database-health.repository.ts`: `DatabaseHealthRepository.isReachable()`, a bounded ping for the health check.
- `user.repository.ts`: `UserRepository` and `User`; `create` returns `null` for a taken email, `findById`, `findWithPasswordHashByEmail`.
- `session.repository.ts`: `SessionRepository`, `Session`, `SessionWithSecretHashes`; `newId`, `create`, `findById`, `findWithSecretHashesById` (for refresh), `rotateSecret` (one conditional update on the current hash, so one of two concurrent rotations wins) and `revoke`.
