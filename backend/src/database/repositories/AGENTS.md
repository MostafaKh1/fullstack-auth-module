# backend/src/database/repositories/AGENTS.md

The data-access layer: every query and write in the back end is a method here. A repository holds no business rule and reads one collection only.

## Conventions

- `<entity>.repository.ts` (kebab-case) exports `<Entity>Repository`, an `@Injectable()` that injects its model (or the connection) and nothing else: no `AppConfigService`, no `ClockService`, no other repository. Values such as `now` arrive as arguments. Register it in `../persistence.module.ts`.
- A method is named for what the caller needs (`findByEmail`) and returns a domain type from `src/auth/auth.types.ts` (`User`, `Session`, imported with `import type`), never a Mongoose document, and never a secret hash unless its name says so (`findWithPasswordHashByEmail`), selecting that field explicitly.
- A repository over a collection with indexes waits for them in `onModuleInit`, so a unique index holds from the first request.
- Canonical example: `user.repository.ts`.

## Inventory

- `user.repository.ts`: `UserRepository`; `create` returns `null` for a taken email, `findById`, `findWithPasswordHashByEmail`.
- `session.repository.ts`: `SessionRepository` and `SessionWithSecretHashes`; `newId`, `create`, `findById`, `findWithSecretHashesById` (for refresh), `rotateSecret` (one conditional update on the current hash, so one of two concurrent rotations wins) and `revoke`.
