# backend/src/database/AGENTS.md

The persistence tier, the data-access layer, and the only door to MongoDB: nothing outside this folder (except the test harness) imports `mongoose`, `@nestjs/mongoose` or a collection, and Biome enforces it. The rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Three doors", "Secrets").

## Layout

```
database/
├── persistence.module.ts   # PersistenceModule: the connection, every collection, every repository, the health ping
├── database-health.ts      # DatabaseHealth: the bounded ping; not a repository, it reads no collection
├── collections/            # one <entity>.collection.ts per MongoDB collection
└── repositories/           # one <entity>.repository.ts per collection
```

## Where does this file belong?

1. A collection's document type, Mongoose schema or index -> `collections/<entity>.collection.ts` (kebab-case, singular).
2. A query or a write, for any caller -> a method on `repositories/<entity>.repository.ts`.
3. A decision about the data (is this Session still live?) -> a service or the guard, not here.
4. A probe of the database itself, not of a collection -> beside `database-health.ts`.

## Conventions

- `persistence.module.ts` registers every collection with `MongooseModule.forFeature` and provides and exports every repository and `DatabaseHealth`; a module imports `PersistenceModule` to inject them. The URI comes from `AppConfigService`, with a short server-selection timeout so boot and queries answer promptly when the database is down.
- A collection file exports `<Entity>Document` (the stored shape), `<ENTITY>_MODEL` (the model name) and `<entity>Schema`, and declares its indexes on the schema. Secret fields (`passwordHash`, `secretHash`) are `select: false`, so every default projection leaves them out.
- A repository is an `@Injectable()` `<Entity>Repository` that injects its model (or the connection) and nothing else: no `AppConfigService`, no `ClockService`, no other repository. Values such as `now` arrive as arguments.
- A repository method is named for what the caller needs (`findByEmail`) and returns a domain type from `src/features/auth/auth.types.ts`, imported with `import type` so no runtime edge points upward; never a Mongoose document, and never a secret hash unless its name says so (`findWithPasswordHashByEmail`), selecting that field explicitly.
- A repository over a collection with indexes waits for them in `onModuleInit`, so a unique index holds from the first request.
- A write two requests may race is one conditional update (`SessionRepository.rotateSecret` matches on the current hash, so one of two concurrent rotations wins).
- Canonical example: `collections/user.collection.ts` with `repositories/user.repository.ts`.
