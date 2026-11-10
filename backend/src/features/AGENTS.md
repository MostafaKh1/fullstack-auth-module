# backend/src/features/AGENTS.md

One folder per feature module (`auth`, `users`, `health`): the routes and the business operations behind them. The rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("One operation, one handler", "Controllers are transport", "Modules").

## Layout of a feature

```
features/<feature>/
├── <feature>.module.ts        # imports DatabaseModule and other lower tiers; exports nothing
├── <feature>.controller.ts    # one method per route, each calling one handler
├── *.schema.ts                # Zod request-body schemas, when a route takes a body
├── *.rules.ts                 # pure functions its handlers share, when there are any
└── handlers/
    └── <operation>.handler.ts # one per business operation
```

## Where does this file belong?

1. A new route on an existing feature -> a method on its controller, plus a handler if it is a new operation.
2. A new operation (verb and object: `sign-up`, `check-health`) -> `handlers/<operation>.handler.ts` exporting `<Operation>Handler` with one public `execute`, listed in the module's `providers`.
3. Logic two handlers share, with no I/O -> a `*.rules.ts` sibling of module-level `export function`s.
4. Something two features need -> a lower tier (`src/database/`, the authentication tier, a global module), never an import from another feature.
5. A new feature -> a new folder with its module, imported in `src/app.module.ts`.

## Conventions

- A handler imports `Injectable` and nothing else from `@nestjs/common`; it throws `ApiError` and returns plain data, and exports its result type (`Health`).
- The controller's field for a handler has the `Handler` suffix (`checkHealthHandler`).
- Canonical example: `health/` (`handlers/check-health.handler.ts`, `health.controller.ts`, `health.module.ts`).

## Inventory

- `health/`: `GET /api/health` through `CheckHealthHandler`; `503 server.unavailable` while the database is unreachable.
- `auth/`: `POST /api/auth/sign-up`, `sign-in` and `refresh` through `SignUpHandler`, `SignInHandler` and `RefreshHandler` (module `AuthFeatureModule`, named apart from the infrastructure tier's `AuthModule`); `auth.schema.ts` holds the field rules, mirrored by the front end; `refresh-cookie.ts` sets and reads the refresh cookie.
- `users/`: the protected `GET /api/users/me` through `GetCurrentUserHandler`.
