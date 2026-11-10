# Spec: Auth Module

- **Status:** ready-for-agent
- **Requirements:** [docs/requirements.md](../requirements.md)
- **Decisions:** [ADR 0001](../adr/0001-session-record-with-short-lived-access-token.md), [ADR 0002](../adr/0002-api-errors-carry-codes-not-copy.md)
- **Tickets:** [docs/tickets/](../tickets/)

## Problem Statement

A person arriving at the application has no way to become a User, no way to prove later that they are that User, and nothing to see once they have.
The application also has no way to tell a signed-in User from anyone else, so it cannot protect anything.

## Solution

A person can Sign up with an email, a name and a password that meet visible rules, and is signed in straight away.
A returning User can Sign in with their email and password.
A signed-in User sees the Application page, which welcomes them, survives a reload, and offers Sign out.
The back end keeps a Session per signed-in device, accepts only signed-in Users on its protected endpoint, and ends a Session for good on Sign out.

## User Stories

1. As a visitor, I want a Sign up page, so that I can become a User.
2. As a visitor, I want to enter my email, name and password on one form, so that Sign up is a single step.
3. As a visitor, I want to be told when my email is not a valid address, so that I can fix a typo before submitting.
4. As a visitor, I want leading and trailing spaces in my email ignored, so that a stray space from autofill does not fail the form.
5. As a visitor, I want my email treated case-insensitively, so that `Ada@X.com` and `ada@x.com` are the same User.
6. As a visitor, I want to be told when my name is shorter than 3 characters, so that I know what is accepted.
7. As a visitor, I want spaces around my name not counted towards its length, so that `"  ab  "` is not mistaken for a valid name.
8. As a visitor with a name in a non-Latin script, I want my name accepted, so that the application works for me.
9. As a visitor, I want to see the password rules as a checklist that ticks off while I type, so that I know when my password is acceptable before I submit.
10. As a visitor, I want a password with a letter, a number, a special character and at least 8 characters accepted, so that I can choose a strong password.
11. As a visitor, I want a password missing any of those rejected with the rule it breaks, so that I can fix it.
12. As a visitor, I want accented letters to count as letters and symbols such as `€` to count as special characters, so that the rules match my keyboard.
13. As a visitor, I want to toggle password visibility, so that I can check what I typed.
14. As a visitor, I want a clear message when my email already has a User, so that I go to Sign in instead.
15. As a visitor, I want to be signed in immediately after Sign up, so that I do not have to type my credentials twice.
16. As a visitor, I want the submit button disabled and showing progress while Sign up is in flight, so that I do not submit twice.
17. As a User, I want a Sign in page with email and password, so that I can return to the application.
18. As a User, I want one generic message when my email or password is wrong, so that nobody can learn from the form which emails are registered.
19. As a User, I want links between Sign up and Sign in, so that I can switch when I picked the wrong one.
20. As a signed-in User, I want to see "Welcome to the application." on the Application page, so that I know I am in.
21. As a signed-in User, I want to see my name on the Application page, so that I know which User I am signed in as.
22. As a signed-in User, I want a reload to keep me signed in, so that refreshing the tab does not throw me out.
23. As a signed-in User, I want to stay signed in while I keep using the application, so that my work is not interrupted every 15 minutes.
24. As a signed-in User with two tabs open, I want both tabs to keep working, so that the application does not sign me out for using it in parallel.
25. As a signed-in User, I want a Sign out button, so that I can end my Session on a shared computer.
26. As a signed-in User, I want Sign out to end my Session on the server, so that nobody can reuse my credentials afterwards.
27. As a User signed in on two devices, I want Sign out on one device to leave the other signed in, so that each device is independent.
28. As a visitor, I want to be sent to Sign in when I open the Application page, and brought back to it afterwards, so that a bookmark still works.
29. As a signed-in User, I want Sign in and Sign up to send me to the Application page, so that I never see a form I do not need.
30. As a User, I want a readable message when the server is unreachable or fails, so that I know to try again rather than assuming my details were wrong.
31. As a User, I want repeated failed attempts slowed down, so that nobody can guess my password by brute force.
32. As a User whose refresh credential was stolen and replayed, I want that Session revoked, so that the thief's access ends.
33. As a developer, I want a protected endpoint that returns the signed-in User, so that I can verify authentication works end to end.
34. As a developer, I want every API error to carry a stable code, so that the front end branches on codes, not on wording.
35. As a developer, I want field-level validation issues from the API, so that the form can put each message next to its field.
36. As a developer, I want interactive API documentation, so that I can try the endpoints without reading the code.
37. As an operator, I want structured logs with a request id that also appears in error responses, so that a User's error report can be traced to a log line.
38. As an operator, I want a health endpoint that checks the database, so that a deployment can tell when the API is ready.
39. As an operator, I want the API to refuse to start with missing or weak configuration, so that a misconfiguration is caught at deploy time.
40. As a reviewer, I want to start the whole stack with documented commands, so that I can evaluate the work quickly.
41. As a reviewer, I want CI to run lint, typecheck, tests and build on every push, so that I can trust the green badge.

## Implementation Decisions

### Modules

- **Back end** (NestJS, MongoDB through Mongoose):
  - `config`: parses the environment with Zod at boot and exposes it through `AppConfigService`.
  - `logging`: pino with a request id per request and a redact list for secrets.
  - `database`: the `User` and `Session` models and their repositories.
  - `auth` (infrastructure): the access-token service, the global guard, `@Public()`, `@CurrentSession()`.
  - `features/auth`: handlers for Sign up, Sign in, refresh and Sign out, and the controller that owns the refresh cookie.
  - `features/users`: the handler and controller for the protected endpoint.
  - `features/health`: liveness and a database ping.
  - `common`: the `ApiError` type, the closed set of error codes, the global exception filter, the Zod validation pipe.
- **Front end** (React, Vite):
  - `api`: the axios client (Bearer attachment, single-flight refresh on `401`, retry once) and one function per endpoint.
  - `features/auth`: the Zod schemas, the Session context, the error copy map, the Sign up and Sign in forms.
  - `pages`: Sign up, Sign in, Application page.
  - `routes`: guards for signed-in-only and signed-out-only pages.
  - `components/ui`: Input, Button, Field, PasswordChecklist.

### API contract

All routes sit under `/api`.

| Method | Path                 | Auth                   | Request                     | Success                                    |
| ------ | -------------------- | ---------------------- | --------------------------- | ------------------------------------------ |
| POST   | `/auth/sign-up`      | Public, throttled      | `{ email, name, password }` | `201 { accessToken, expiresIn, user }` + cookie |
| POST   | `/auth/sign-in`      | Public, throttled      | `{ email, password }`       | `200 { accessToken, expiresIn, user }` + cookie |
| POST   | `/auth/refresh`      | Refresh cookie, Origin | none                        | `200 { accessToken, expiresIn, user }` + rotated cookie |
| POST   | `/auth/sign-out`     | Refresh cookie, Origin | none                        | `204`, cookie cleared                      |
| GET    | `/users/me`          | Access token           | none                        | `200 { id, email, name, createdAt }`       |
| GET    | `/health`            | Public                 | none                        | `200 { status, database }`, `503` if the database is down |

- `user` in auth responses has the same shape as `/users/me`.
- The refresh cookie is `httpOnly`, `SameSite=Lax`, `Path=/api/auth`, `Secure` in production, and its `Max-Age` matches the Session's expiry.
- Sign out with no or an unknown cookie still returns `204` and clears the cookie: Sign out is idempotent.
- Error codes: `request.validation_failed` (400), `auth.unauthenticated` (401), `auth.invalid_credentials` (401), `auth.session_expired` (401), `auth.origin_rejected` (403), `route.not_found` (404), `user.email_taken` (409), `request.rate_limited` (429), `server.internal` (500), `server.unavailable` (503).

### Schemas

```ts
// The two documents' shapes; ids are ObjectIds.
type User = {
  email: string; // trimmed, lowercased, unique index
  name: string; // trimmed
  passwordHash: string; // argon2id, excluded from default projections
  createdAt: Date;
  updatedAt: Date;
};

type Session = {
  userId: ObjectId; // indexed
  secretHash: string; // sha256 of the current refresh secret
  previousSecretHash: string | null; // the secret just replaced, accepted during the grace window
  rotatedAt: Date | null;
  expiresAt: Date; // TTL index; slides forward on refresh, never past absoluteExpiresAt
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  revokedReason: "sign-out" | "reuse-detected" | null;
  userAgent: string | null;
  createdAt: Date;
};
```

### Session behaviour

- The access token is a 15 minute HS256 JWT with `sub` (User id) and `sid` (Session id); the guard also rejects a token whose Session is revoked, which costs one indexed read per protected request and keeps Sign out immediate.
- Sessions expire after 7 days without a refresh, and never live past 30 days in total.
- Refresh accepts the current secret, or the previous one within 10 seconds of the last rotation; any other secret for a live Session revokes it with `reuse-detected`.
- Rotation is one conditional update on the current `secretHash`, so two concurrent refreshes cannot both rotate from the same secret.

### Front-end behaviour

- On boot the app calls refresh once; until it settles a full-page loading state is shown, so guards never flash the wrong page.
- Concurrent `401`s share one refresh promise; a failed refresh clears the Session and the guards send the User to Sign in.
- A redirect to Sign in carries the intended path; after Sign in or Sign up the User lands there, or on the Application page by default.

### Security

- `helmet` headers; CORS allowlist from configuration with credentials; throttling on Sign up and Sign in per IP.
- The `Origin` check on the cookie routes accepts only the configured front-end origins, and lets through requests that carry no `Origin` (non-browser clients cannot ride a browser's cookie).
- Request bodies are capped at a small size.

## Testing Decisions

- A good test drives a public seam and asserts observable behaviour, with expected values taken from [docs/requirements.md](../requirements.md) or a worked example.
- **Back-end seam: the HTTP API.** Supertest against the full Nest application, backed by a throwaway `mongod` from `mongodb-memory-server`. Covers every field rule, every error code, cookie attributes, rotation, the grace window, reuse revocation, the guard, the `Origin` check and throttling. A controllable clock drives the time-based cases.
- **Front-end seam: the rendered app.** Vitest + Testing Library rendering the whole app with its router, the network faked by MSW so the real API client and refresh logic run. Covers form validation, the live checklist, server issues on fields, error copy by code, redirects, boot restore and Sign out.
- **Full-stack seam: Playwright.** A real browser against both real apps and a real database, for the journeys Sign up -> reload -> Sign out -> Sign in, and a wrong-password Sign in.
- **Shared examples.** Each app keeps a copy of one table of worked examples for the field rules, and its suite runs every row; the copies point at each other.
- There is no prior art: this is the first code in the repository.

## Out of Scope

Email verification, password reset, "remember me", social sign-in, a list of signed-in devices, account deletion, and deployment.

## Further Notes

- The brief allows a few hours; the tickets are sized so each one lands as one green commit.
- `AI.md` gains one entry per ticket, recording what was generated, what was corrected and what was decided differently.
