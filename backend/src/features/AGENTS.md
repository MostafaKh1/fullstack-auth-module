# backend/src/features/AGENTS.md

One folder per feature module, tier 4: the routes and the business operations behind them. Authentication lives in `src/auth/` and the health check in `src/health/`; everything else a User does is a feature here. The rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("One operation, one handler", "Controllers are transport", "Modules").

## Layout of a feature

```
features/<feature>/
├── <feature>.module.ts        # imports PersistenceModule and other lower tiers; exports nothing
├── <feature>.controller.ts    # one method per route, each calling one handler
├── <feature>.types.ts         # Zod request schemas and their types, when a route takes a body
├── *.rules.ts                 # pure functions its handlers share, when there are any
└── handlers/
    └── <operation>.handler.ts # one per business operation
```

## Where does this file belong?

1. A new route on an existing feature -> a method on its controller, plus a handler if it is a new operation.
2. A new operation (verb and object: `get-current-user`) -> `handlers/<operation>.handler.ts` exporting `<Operation>Handler` with one public `execute`, listed in the module's `providers`.
3. Logic two handlers share, with no I/O -> a `*.rules.ts` sibling of module-level `export function`s.
4. Something two features need -> a lower tier (`src/database/`, `src/auth/`, `src/common/`, `src/core/`), never an import from another feature.
5. A new feature -> a new kebab-case folder with its module, imported in `src/app.module.ts`.

## Conventions

- A handler imports `Injectable` and nothing else from `@nestjs/common`; it throws `ApiError` and returns plain data, and exports its result type when it has one.
- The controller's field for a handler has the `Handler` suffix (`getCurrentUserHandler`).
- Canonical example: `users/`.

## Inventory

- `users/`: the protected `GET /api/users/me` through `GetCurrentUserHandler`, reading the User with `@CurrentUser()`.
