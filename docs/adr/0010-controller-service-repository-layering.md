# The back end is layered controller, service, repository

The back end follows NestJS's usual layering, so every class sits where a NestJS engineer looks for it: a **controller** is the API only (the route, extracting the body, headers and current User, calling one service method, calling `AuthCookiesService`, and mapping the result to the response type); a **service** holds the business logic (an operation's rules, ordering and failure policy, throwing `ApiError`) and knows nothing about HTTP; a **repository** in `src/database/repositories/` is the data-access layer for one collection, mapping documents onto the domain types in `src/common/types/`.
This supersedes the one-handler-per-operation part of ADR 0005: `SignUpHandler`, `SignInHandler` and `RefreshHandler` became methods of `AuthService`, the Session rules and `SessionIssuerService` became `SessionService`, and each feature has one `<feature>.service.ts`.
The rest of ADR 0005 (the tiers, repositories as the only door to Mongoose, Zod, pino) stands.

## Considered options

- **Keep one handler per operation.** Each operation's ordering is easy to find in its own file, but the shape is unfamiliar in a NestJS codebase, and the operations of one area (Sign up, Sign in, refresh) share most of their collaborators, so the handlers repeated the same constructor and leaned on a `*.rules.ts` file and an issuer service to share logic.
- **Business logic in controllers.** Fewer classes, but a controller then needs the clock, configuration and repositories, and the rules cannot be read apart from the HTTP plumbing.

## Consequences

- Biome's `noRestrictedImports` enforces two of the boundaries (`biome.jsonc`): nothing outside `src/database/` (and the test harness) imports `mongoose`, `@nestjs/mongoose` or a collection; a service other than `AuthCookiesService` (`src/features/auth/services/auth-cookies.service.ts`) imports neither `express` nor `AuthCookiesService`; a controller imports nothing from `src/database/`, `ClockService` or `AppConfigService`.
- The domain types live in `src/common/types/` (ADR 0005) and the repositories import them as types only, so no runtime edge points upward. `AuthContext`, which `src/common/` and the features both need, lives in `src/common/services/access-token.service.ts`.
- A service with several public methods is the price: when one grows long, the operation's private steps move to a helper in the same file before a second service is split off.
- `AuthCookiesService` is the one service that touches the response, because it is transport: the cookie's name, attributes and `Expires`, which it sets to the Session's idle expiry.
