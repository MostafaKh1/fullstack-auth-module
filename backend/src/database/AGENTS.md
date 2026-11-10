# backend/src/database/AGENTS.md

The persistence tier and the only door to MongoDB: nothing outside this folder imports `mongoose`, `@nestjs/mongoose` or a collection. The rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Three doors", "Secrets").

## Layout

```
database/
├── persistence.module.ts   # PersistenceModule: the connection, every collection, every repository
├── collections/            # one <entity>.collection.ts per MongoDB collection: AGENTS.md there
└── repositories/           # one <entity>.repository.ts per question asked of it: AGENTS.md there
```

## Where does this file belong?

1. A collection's document type, Mongoose schema or index -> [collections/AGENTS.md](collections/AGENTS.md).
2. A query or a write, for any caller -> [repositories/AGENTS.md](repositories/AGENTS.md).
3. A decision about the data (is this Session still live?) -> a handler or a `*.rules.ts` in its module, not here.

## Conventions

- `persistence.module.ts` registers every collection with `MongooseModule.forFeature` and provides and exports every repository; a module imports `PersistenceModule` to inject them.
- No other file sits at this level.

## Inventory

- `persistence.module.ts`: `PersistenceModule`; the URI comes from `AppConfigService`, with a 2 s server-selection timeout so boot and queries answer promptly when the database is down.
