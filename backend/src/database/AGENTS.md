# backend/src/database/AGENTS.md

The persistence tier, the data-access layer, and the only door to MongoDB: nothing outside this folder (except the test harness) imports `mongoose`, `@nestjs/mongoose` or a collection, and Biome enforces it. The rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Three doors", "Secrets").

## Layout

```
database/
├── persistence.module.ts   # PersistenceModule: the connection, every collection, every repository, the health ping
├── database-health.ts      # DatabaseHealth: the bounded ping; not a repository, it reads no collection
├── collections/            # one <entity>.collection.ts per MongoDB collection: AGENTS.md there
└── repositories/           # one <entity>.repository.ts per collection: AGENTS.md there
```

## Where does this file belong?

1. A collection's document type, Mongoose schema or index -> [collections/AGENTS.md](collections/AGENTS.md).
2. A query or a write, for any caller -> [repositories/AGENTS.md](repositories/AGENTS.md).
3. A decision about the data (is this Session still live?) -> the service of its module (`SessionService`), not here.
4. A probe of the database itself, not of a collection -> beside `database-health.ts`.

## Conventions

- `persistence.module.ts` registers every collection with `MongooseModule.forFeature` and provides and exports every repository and `DatabaseHealth`; a module imports `PersistenceModule` to inject them.
- Only the module and `database-health.ts` sit at this level.

## Inventory

- `persistence.module.ts`: `PersistenceModule`; the URI comes from `AppConfigService`, with a 2 s server-selection timeout so boot and queries answer promptly when the database is down.
- `database-health.ts`: `DatabaseHealth.isReachable()`, a ping bounded at 1.5 s, for `HealthService`.
