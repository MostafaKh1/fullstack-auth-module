# Spec: Auth Module

Requirements: [docs/requirements.md](../requirements.md) · Vocabulary: [GLOSSARY.md](../../GLOSSARY.md) · Decisions: [ADR 0001](../adr/0001-session-record-with-short-lived-access-token.md), [ADR 0002](../adr/0002-api-errors-carry-codes-not-copy.md) · Standards: [CODING_STANDARDS.md](../../CODING_STANDARDS.md)

## Problem Statement

A person arriving at the application has no way to become a User, no way to prove later that they are that User, and nothing to see once they have.
The application cannot tell a signed-in User from anyone else, so it cannot protect anything, and a person on a shared computer has no way to end their Session.

## Solution

A person can Sign up with an email, a name and a password that meet visible rules, and is signed in straight away.
A returning User can Sign in with their email and password.
A signed-in User sees the Application page, which welcomes them by name, survives a reload and access-token expiry, and offers Sign out.
The back end keeps one Session per signed-in device, accepts only signed-in Users on its protected endpoint, revokes a Session whose refresh credential is replayed, and ends a Session for good on Sign out.

## User Stories

1. As a visitor, I want a Sign up page, so that I can become a User.
2. As a visitor, I want to enter my email, name and password on one form, so that Sign up is a single step.
3. As a visitor, I want to be told when my email is not a valid address, so that I can fix a typo before submitting.
4. As a visitor, I want leading and trailing spaces in my email ignored, so that a stray space from autofill does not fail the form.
5. As a visitor, I want my email treated case-insensitively, so that `Ada@X.com` and `ada@x.com` are the same User.
6. As a visitor, I want to be told when my email is longer than 254 characters, so that I know why it was refused.
7. As a visitor, I want to be told when my name is shorter than 3 characters, so that I know what is accepted.
8. As a visitor, I want spaces around my name not counted towards its length, so that `"  ab  "` is not mistaken for a valid name.
9. As a visitor with a name in a non-Latin script, I want my name accepted, so that the application works for me.
10. As a visitor, I want names longer than 50 characters or containing control characters refused, so that names stay displayable.
11. As a visitor, I want to see the password rules as a checklist that ticks off while I type, so that I know my password is acceptable before I submit.
12. As a visitor, I want a password with a letter, a number, a special character and 8 to 128 characters accepted, so that I can choose a strong password.
13. As a visitor, I want a password missing any of those rejected with the rule it breaks, so that I can fix it.
14. As a visitor, I want accented letters to count as letters and symbols such as `€` or an emoji to count as special characters, so that the rules match my keyboard.
15. As a visitor, I want a space not to count as a special character but still be allowed in my password, so that passphrases work.
16. As a visitor, I want to toggle password visibility, so that I can check what I typed.
17. As a visitor, I want a clear message on the email field when my email already has a User, so that I go to Sign in instead.
18. As a visitor, I want to be signed in immediately after Sign up, so that I do not type my credentials twice.
19. As a visitor, I want the submit button disabled and showing progress while a request is in flight, so that I do not submit twice.
20. As a visitor, I want any validation problem the server finds shown next to the field it concerns, so that I can fix it in place.
21. As a User, I want a Sign in page with email and password, so that I can return to the application.
22. As a User, I want one generic message when my email or password is wrong, so that nobody can learn from the form which emails are registered.
23. As a User, I want Sign in to take the same time whether or not my email exists, so that timing cannot reveal registered emails either.
24. As a User whose password predates the current rules, I want Sign in to accept it, so that a policy change does not lock me out.
25. As a User, I want links between Sign up and Sign in, so that I can switch when I picked the wrong one.
26. As a signed-in User, I want to see "Welcome to the application." on the Application page, so that I know I am in.
27. As a signed-in User, I want to see "Signed in as" with my name on the Application page, so that I know which User I am signed in as.
28. As a signed-in User, I want a reload to keep me signed in, so that refreshing the tab does not throw me out.
29. As a signed-in User, I want to stay signed in while I keep using the application, so that I am not interrupted every 15 minutes.
30. As a signed-in User with two tabs open, I want both tabs to keep working, so that using the application in parallel does not sign me out.
31. As a signed-in User returning after a week of inactivity, I want to be asked to sign in again, so that an abandoned device does not stay signed in.
32. As a User, I want every Session to end after 30 days at most, so that a stolen credential cannot be used forever.
33. As a signed-in User, I want a Sign out button, so that I can end my Session on a shared computer.
34. As a signed-in User, I want Sign out to end my Session on the server immediately, so that nobody can reuse my credentials afterwards.
35. As a User signed in on two devices, I want Sign out on one device to leave the other signed in, so that each device is independent.
36. As a visitor, I want to be sent to Sign in when I open the Application page, and brought back to it afterwards, so that a bookmark still works.
37. As a signed-in User, I want Sign in and Sign up to send me to the Application page, so that I never see a form I do not need.
38. As a User, I want a loading state while the application checks whether I am signed in, so that I never see a flash of the wrong page.
39. As a User, I want a readable message when the server is unreachable or fails, so that I know to try again rather than assuming my details were wrong.
40. As a User, I want repeated attempts slowed down, so that nobody can guess my password by brute force.
41. As a User whose refresh credential was stolen and replayed, I want that Session revoked, so that the thief's access ends.
42. As a User, I want my refresh credential unreadable by scripts on the page, so that a script injection cannot steal a long-lived credential.
43. As a User, I want requests from other websites unable to use my Session, so that cross-site forgery cannot act as me.
44. As a developer, I want a protected endpoint that returns the signed-in User, so that I can verify authentication end to end.
45. As a developer, I want every route protected unless it is explicitly marked public, so that a new endpoint can never be unprotected by omission.
46. As a developer, I want every API error to carry a stable code from a closed set, so that the front end branches on codes, not wording.
47. As a developer, I want field-level validation issues as a path and a rule id, so that the form can put its own message next to each field.
48. As a developer, I want interactive API documentation, so that I can try the endpoints without reading the code.
49. As an operator, I want structured logs with a request id that also appears in every error response, so that a User's error report can be traced to a log line.
50. As an operator, I want passwords, tokens and cookies kept out of logs, so that logs are never a source of credentials.
51. As an operator, I want a health endpoint that checks the database, so that a deployment can tell when the API is ready.
52. As an operator, I want the API to refuse to start with missing or weak configuration, listing what is wrong, so that a misconfiguration is caught at deploy time.
53. As an operator, I want security headers, an allowlist of front-end origins and a cap on request size, so that the API is hardened by default.
54. As a reviewer, I want to start the whole stack with a few documented commands, so that I can evaluate the work quickly.
55. As a reviewer, I want CI to run lint, typecheck, tests, build and the browser journeys on every push, so that I can trust a green result.
56. As a reviewer, I want a README and an AI.md, so that I understand how to work with the repository and how AI assistance was used.

## Implementation Decisions

### Repository and tooling

- Two independent npm apps, a NestJS back end and a React front end, plus a thin root that holds git hooks and convenience scripts. No workspace tooling.
- Biome lints and Prettier formats (print width 110, double quotes, trailing commas); a pre-commit hook runs both on staged files, lint before format.
- GitHub Actions runs lint, typecheck, test and build for both apps, then the browser journeys.
- Docker Compose runs MongoDB for local development; each app ships a production Dockerfile.
- No native `.node` addons: the development machine's Windows Application Control blocks unsigned ones. Rollup runs as its WebAssembly build.

### Back end

- NestJS 11 on Express 5, MongoDB through Mongoose, Zod v4 for request validation and configuration, pino for structured logs.
- Module tiers, lowest first: configuration and logging and shared providers (the clock), then the database (models and repositories), then authentication infrastructure (token service, password hasher, global guard), then the feature modules (auth, users, health). A module imports only from a lower tier; feature modules export nothing.
- Three doors: the database is reached only through injected repositories; configuration only through the configuration service, parsed with Zod at boot so an invalid environment stops the process with every bad variable named; the current time only through an injectable clock, so expiry and grace windows are testable.
- Controllers are the API only, services hold the business logic, repositories are the data-access layer (ADR 0010): `AuthService` (Sign up, Sign in, refresh, Sign out), `SessionService`, `UsersService` (get current User), `HealthService`. Controllers extract the request, call one service method, and set the cookie through `AuthCookiesService`, which owns the cookie policy.
- Authentication is deny-by-default: a global guard requires a valid access token on every route unless the route is marked public. Public routes: Sign up, Sign in, refresh, Sign out, health.
- Passwords are stored as scrypt hashes from Node's built-in crypto, with the cost (log2 N, default 17) and a per-password salt encoded in the hash. Password hashes are excluded from every default query projection.
- Sign in with an unknown email still verifies against a decoy hash, so both failures cost the same time and return the same code.

### Sessions (ADR 0001)

- A Session is a database record and the authority on whether a User is signed in. Its fields: the User it belongs to, the SHA-256 hash of the current refresh secret, the hash of the immediately previous secret and when it was replaced, an idle expiry that slides forward on refresh, an absolute expiry that never moves, a revoked-at time and reason (`sign-out` or `reuse-detected`), the user agent, and its creation time. Mongo removes a Session after its idle expiry.
- The refresh credential is `<sessionId>.<secret>`, where the secret is 32 random bytes; only the secret's hash is stored.
- The access token is a 15 minute HS256 JWT carrying the User id and the Session id, with its times taken from the clock. The guard also checks that the token's Session is live, one indexed read per protected request, so Sign out takes effect immediately.
- Refresh rotates the secret in one conditional update, slides the idle expiry by 7 days without passing the 30 day absolute cap, and accepts the immediately previous secret for 10 seconds after a rotation so two tabs refreshing together are not mistaken for replay. Any other replay revokes the Session as `reuse-detected`.
- The refresh cookie is `httpOnly`, `SameSite=Lax`, scoped to the auth routes' path, `Secure` in production, with a lifetime matching the Session's idle expiry.
- The cookie routes (refresh and Sign out) also check `Origin`: a request whose `Origin` is not a configured front-end origin is refused; a request with no `Origin` is let through, since only browsers carry the cookie.
- Each Sign up and each Sign in starts a new Session. Sign out revokes only the current Session and is idempotent.
- Lifetimes, the grace window and the password cost are configuration, with the defaults above.

### API contract

All routes sit under `/api`.

| Method | Path             | Auth                   | Request                     | Success                                                     |
| ------ | ---------------- | ---------------------- | --------------------------- | ----------------------------------------------------------- |
| POST   | `/auth/sign-up`  | Public, throttled      | `{ email, name, password }` | `201 { accessToken, expiresIn, user }` + cookie             |
| POST   | `/auth/sign-in`  | Public, throttled      | `{ email, password }`       | `200 { accessToken, expiresIn, user }` + cookie             |
| POST   | `/auth/refresh`  | Refresh cookie, Origin | none                        | `200 { accessToken, expiresIn, user }` + new cookie         |
| POST   | `/auth/sign-out` | Refresh cookie, Origin | none                        | `204`, cookie cleared                                       |
| GET    | `/users/me`      | Access token           | none                        | `200 { id, email, name, createdAt }`                        |
| GET    | `/health`        | Public                 | none                        | `200 { status, database }`; `503` when the database is down |

- `user` in auth responses has the same shape as `/users/me`.
- Every error is the envelope of ADR 0002, `{ code, status, traceId, retryable, issues?, message? }`, produced by one global exception filter. `traceId` is the request id, also returned as the `X-Request-Id` header and reused when the caller supplies one. `message` is a developer hint omitted in production.
- The closed set of codes: `request.validation_failed` (400), `request.malformed` (400), `request.too_large` (413), `request.rate_limited` (429), `auth.unauthenticated` (401), `auth.invalid_credentials` (401), `auth.session_expired` (401), `auth.origin_rejected` (403), `route.not_found` (404), `user.email_taken` (409), `server.internal` (500), `server.unavailable` (503).
- Validation issues are `{ path, code }`, where `code` is a rule id: `field.required`, `email.invalid`, `email.too_long`, `name.too_short`, `name.too_long`, `name.invalid_characters`, `password.too_short`, `password.too_long`, `password.missing_letter`, `password.missing_number`, `password.missing_special`.
- A taken email, including from two concurrent Sign ups, is caught by the unique index and answered `409 user.email_taken`.
- Security: `helmet` headers, a CORS allowlist from configuration with credentials, throttling of Sign up and Sign in per IP, a small request body cap. Swagger UI documents every route, its schemas and its error codes, and can call the protected endpoint with a Bearer token.

### Field rules

Per [docs/requirements.md](../requirements.md), enforced identically by both apps:

- Email: trimmed, lowercased, at most 254 characters, the browser's `type="email"` format.
- Name: at least 3 characters after trimming, at most 50, any script, no control characters.
- Password at Sign up: 8 to 128 characters, at least one Unicode letter, one digit 0-9, and one character that is not a letter, a number or whitespace; never trimmed.
- Password at Sign in: non-empty and at most 128 characters; the Sign up policy is not applied.

### Front end

- React 19, Vite, TypeScript, React Router, TanStack Query for server state, React Hook Form with Zod resolvers, Tailwind 4 with CVA variants and a class-merging helper, axios.
- One API client attaches the access token as `Bearer`; components call one function per endpoint, never the client directly.
- The Session lives in one React context with three states: restoring, signed in, signed out. The access token is kept in memory only.
- On boot the app calls refresh once and shows a full-page loading state until it settles. Concurrent `401 auth.unauthenticated` responses share one refresh, then each request retries once; a failed refresh clears the Session locally.
- Routes: Sign up, Sign in, and the Application page. A guard sends a signed-out visitor to Sign in carrying the intended path and returns them there afterwards; a second guard sends a signed-in User away from Sign in and Sign up.
- Forms validate on blur and on submit, show server issues on their fields and a taken email on the email field, and show anything else as a form-level alert. The Sign up form shows the password rules as a live checklist.
- Every user-facing sentence lives in the front end, keyed by error code or rule id, with a generic fallback; the server's `message` is never shown.
- The Application page shows the exact heading "Welcome to the application.", "Signed in as {name}" loaded from the protected endpoint, and a Sign out button.

## Testing Decisions

- A good test drives a public seam and asserts observable behaviour. It never reaches past the seam into a private method or mocks an internal collaborator. Expected values come from [docs/requirements.md](../requirements.md) or a worked example, never recomputed the way the code computes them. Test names read as behaviours in glossary terms.
- **Seam 1: the back end's HTTP API.** The real Nest application, wired exactly as in production, driven over HTTP against a throwaway MongoDB per test file. It covers every field rule, every error code and the envelope, the request id, the boot-time configuration failure, health up and down, cookie attributes, the stored hash, duplicate and concurrent Sign up, Sign in failures and their timing, rotation, the grace window, replay revocation, idle and absolute expiry, the guard, the protected endpoint, the `Origin` check, throttling, the body cap and the security headers. Time-based cases use a controllable clock. Data is seeded and inspected through the raw collections, never through the repository under test.
- **Seam 2: the front end's rendered app.** The whole app with its router rendered in Vitest and Testing Library, the network faked at the HTTP level with MSW so the real API client, refresh logic and guards run; any request a test did not declare fails it. It covers form validation, the live checklist, server issues on fields, error copy by code, the guards and return path, boot restore without a flash, single-flight refresh, and Sign out.
- **Seam 3: a few browser journeys.** Playwright against both real apps and a real database: Sign up, the Application page, reload, Sign out, Sign in; and a Sign in with a wrong password. These catch drift between the two apps (paths, cookie scope, the dev proxy, CORS), not edge cases.
- **Shared worked examples.** Each app keeps a copy of one table of field-rule examples, and the first two seams run every row; the copies point at each other so a rule changes in both places at once.
- There is no prior art: there is no code in the repository yet.

## Out of Scope

Email verification, password reset, "remember me", social sign-in, a list of signed-in devices, account deletion, admin roles, and deployment to a hosting provider.

## Further Notes

- The brief allows a few hours; scope is held to it, and each ticket should land as one green commit.
- `AI.md` gains an entry per ticket: what was AI-generated, what was verified, what was corrected, and what was decided differently.
- The repository is public on GitHub, as the brief's submission requires.
