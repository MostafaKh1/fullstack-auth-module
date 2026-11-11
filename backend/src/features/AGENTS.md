# backend/src/features/AGENTS.md

One folder per feature module, tier 4: the routes and the business logic behind them. Authentication lives in `src/auth/` and the health check in `src/health/`; everything else a User does is a feature here. The rules are in [CODING_STANDARDS.md](../../../CODING_STANDARDS.md) ("Controller, service, repository", "Modules").

## Layout of a feature

```
features/<feature>/
├── <feature>.module.ts        # imports PersistenceModule and other lower tiers; exports nothing
├── <feature>.controller.ts    # the API only: one method per route, each calling one service method
├── <feature>.service.ts       # the business logic: one public method per operation
└── <feature>.types.ts         # Zod request schemas and their types, when a route takes a body
```

## Where does this file belong?

1. A new route on an existing feature -> a method on its controller, plus a method on its service if it is a new operation (verb and object: `getCurrentUser`).
2. Logic two operations of the feature share, with no I/O -> a private function in `<feature>.service.ts`.
3. Data access -> a repository method in `src/database/repositories/`, injected into the service; never into the controller.
4. Something two features need -> a lower tier (`src/database/`, `src/auth/`, `src/common/`, `src/core/`), never an import from another feature.
5. A new feature -> a new kebab-case folder with its module, controller and service, imported in `src/app.module.ts`.

## Conventions

- A service imports `Injectable` and nothing else from `@nestjs/common`; it throws `ApiError`, returns domain types (`src/auth/auth.types.ts`), and exports its result type when it has one.
- The controller's field for its service is the class name in camelCase (`usersService`).
- Canonical example: `users/`.

## Inventory

- `users/`: the protected `GET /api/users/me` through `UsersService.getCurrentUser`, reading the User with `@CurrentUser()`.
