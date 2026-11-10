# backend/src/database/AGENTS.md

The database tier and the only door to MongoDB: nothing outside this folder imports `mongoose`, `@nestjs/mongoose` or a model. The rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Three doors", "Secrets").

## Where does this file belong?

1. A Mongoose schema and model for a collection -> `<entity>.model.ts` here, registered in `database.module.ts` with `MongooseModule.forFeature`.
2. A query or a write, for any caller -> a method on `<entity>.repository.ts` here, named for what the caller needs (`findByEmail`), returning plain data rather than a Mongoose document.
3. An index (the unique email, the Session expiry) -> declared on the model's schema.
4. A decision about the data (is this Session still live?) -> a handler or a `*.rules.ts` in its feature, not here.

## Conventions

- A repository is an `@Injectable()` class that injects its model (or the connection) and nothing else: no `AppConfigService`, no `Clock`, no other repository. Values such as `now` arrive as arguments.
- Secret fields (`passwordHash`, `secretHash`) are excluded from the schema's default projection; the one method that needs one selects it explicitly.
- `database.module.ts` provides and exports every repository; a feature module imports `DatabaseModule` to inject them.
- Canonical example: `database-health.repository.ts` (injects the connection, answers one question, hides the driver); `user.model.ts` with `user.repository.ts` for a collection.
- A repository returns its own plain type (`User`, `Session`), never with a secret hash unless the method name says so (`findWithPasswordHashByEmail`). It waits for its indexes in `onModuleInit`, so a unique index holds from the first request.

## Inventory

- `database.module.ts`: the connection (URI from `AppConfigService`, a fast server-selection timeout) and the exported repositories.
- `database-health.repository.ts`: `DatabaseHealthRepository.isReachable()`, a bounded ping for the health check.
- `user.model.ts`, `user.repository.ts`: the User record (unique email, `passwordHash` unselected); `create` returns `null` for a taken email.
- `session.model.ts`, `session.repository.ts`: the Session record of ADR 0001 (secret hashes unselected, a TTL index on `idleExpiresAt`); `newId`, `create`, `findById`.
