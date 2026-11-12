# Spec: Close login CSRF and refuse bodies the API cannot read

## Problem Statement

A hostile web page can sign a visitor into the attacker's account without the visitor noticing. The page auto-submits a hidden HTML form to Sign in carrying the attacker's own email and password. The browser sends it cross-site with no preflight, because a form post is a simple request.

The back end accepts it. Nest's default form (urlencoded) parser is still switched on behind our JSON parser, so the form body is read as if it were JSON. Sign in also does not check `Origin`, which only refresh and Sign out do. The response sets the attacker's refresh cookie, and the browser stores it, because a cookie set on a top-level cross-site POST response is stored even under `SameSite=Lax`.

The next time the visitor opens the app, it restores the attacker's Session, so anything the visitor then does lands in the attacker's account. Sign up has the same flaw.

The same hidden parser lets form bodies bypass the API's body-size limit, and its errors come back as server errors (`500`) instead of a clean refusal. Separately, a JSON body with an unsupported charset or encoding also answers `500` and writes an error log, when it is the caller's mistake.

An earlier security pass listed login CSRF as rejected; that was wrong.

## Solution

The API reads only JSON bodies, and Sign up and Sign in refuse a request whose `Origin` is not the app's own. A cross-site form post therefore never reaches Sign in, and even a request the browser could send without a preflight is refused by origin. Every body the API cannot read as JSON is refused with `400 request.malformed`, and one over the size limit with `413 request.too_large`; neither is logged as a server error. Users signing up and signing in from the app see no change.

## User Stories

1. As a User, I want a hostile page to be unable to sign me into someone else's account, so that what I do in the app always lands in my own account.
2. As a User, I want Sign up from a hostile page refused, so that no one can create an account in my browser's name and plant its Session.
3. As a User, I want signing up and signing in from the app itself to work exactly as before, so that the fix is invisible to me.
4. As an operator, I want Sign up and Sign in to refuse a foreign `Origin` with `403 auth.origin_rejected`, so that a cross-site request is stopped before any credential is checked.
5. As an operator, I want no Session cookie set and no User created when such a request is refused, so that a refused request has no effect.
6. As an operator, I want the API to parse only JSON bodies, so that a form-encoded or other non-JSON body never reaches a route as data.
7. As an operator, I want a non-JSON body answered `400 request.malformed`, so that callers get the existing error code and no new one is introduced.
8. As an operator, I want every body over the size limit refused with `413 request.too_large` whatever its content type, so that no parser bypasses the limit.
9. As an operator, I want an unsupported charset or encoding answered `400 request.malformed` and not logged as a server error, so that a caller's mistake does not page anyone.
10. As an operator, I want a genuine failure inside the body parser still treated as a server error, so that real faults are still logged.
11. As an API consumer using curl or Swagger's "Try it out", I want requests with no `Origin` header still accepted, so that non-browser clients keep working.
12. As an operator, I want Sign up and Sign in still throttled before the origin check, so that a flood of foreign-origin requests is still rate-limited.
13. As a maintainer, I want production and the test harness to create the app in one shared place, so that the tests can never again run with a different body parsing than production.
14. As a maintainer, I want each part of the fix covered by a test that failed before it, so that a regression is caught in CI.
15. As a maintainer, I want the architecture notes to state that every route that sets or reads the refresh cookie carries the origin check, so that the next such route gets it too.
16. As a reviewer, I want the ADRs and the AI log to record the decision and correct the earlier "rejected" verdict, so that the history is honest.

## Implementation Decisions

- **Body parsing**: the Nest application is created with its built-in body parsers switched off. The API's own JSON parser remains the only one, with its size limit. That creation happens in one factory shared by the production entry point and the test harness.
- **Bodies the JSON parser skips**: a body of another content type is left unparsed, and the existing step that marks an unparsed body as absent stays. The procedure's input schema then refuses it as `request.malformed`. No new error code, no change to the contract.
- **Parser errors**: the JSON parser's error handler keeps mapping a too-large body to `413 request.too_large`. Every other client error it raises (an unsupported charset, an unsupported encoding, malformed JSON) answers `400 request.malformed` without an error-level log. A server-side failure in the parser still reaches the global filter.
- **Origin check**: Sign up and Sign in carry the existing origin guard after the throttler, the same order as refresh. The guard's rule is unchanged: a foreign `Origin` is refused with `403 auth.origin_rejected`, a missing `Origin` passes, and the allowed origins are the configured CORS origins. The app's own requests, direct or through the dev proxy, carry an allowed origin.
- **Docs**: the decisions are already recorded and land as the branch's first commit:
  - ADR 0001 now says Sign up and Sign in check `Origin`, that the API parses only JSON, and why (login CSRF).
  - ADR 0002 now says a body the API cannot read as JSON answers `request.malformed`, and one over the limit `request.too_large`.

  Two more edits go in this ticket:
  - The back end's architecture notes widen the guard rule from "a cookie route" to "every route that sets or reads the refresh cookie".
  - The AI log corrects the earlier security entry that listed login CSRF as rejected.

  No glossary change.

## Testing Decisions

- A good test sends a real HTTP request to the real application and asserts what a caller sees: the status, the error code, whether a cookie was set, and whether a User exists. It never asserts how the guard or the parser are wired.
- **Seam**: the existing back-end HTTP suites against a throwaway MongoDB, for Sign up, Sign in and the body-parser hardening. No new seam.
- **Red first**:
  - A form-encoded Sign in from an existing User answers `400 request.malformed` and sets no cookie.
  - A form-encoded Sign up answers the same, and no User is created.
  - A JSON Sign in and a JSON Sign up with a foreign `Origin` answer `403 auth.origin_rejected`, set no cookie and create no User.
  - A body with an unsupported charset answers `400 request.malformed` and writes no error-level log line.
- **Guarded by the existing suites**: Sign up and Sign in without an `Origin`, and with an allowed one, still succeed.
- **The browser journeys** must still pass. They prove the real app's own origin is accepted through the dev proxy.
- **Prior art**: the refresh and Sign out origin-guard tests, the existing malformed-body and too-large tests, and the logging tests that read the captured log lines.

## Out of Scope

- A new error code for an unsupported media type.
- Rejecting requests with no `Origin` header.
- CSRF tokens, or a stricter `SameSite` setting on the refresh cookie.
- Any change to the contract, the front end, or what a User sees.
- The feature-folders work of spec #52.

## Further Notes

- One ticket, `model:opus` and `effort:high`, branched from `main` with its own pull request. It touches only the back end and its docs, so it does not conflict with spec #52.
- The ADR 0001 and ADR 0002 edits are already written on the branch `fix/login-csrf` and land as its first commit, with this spec's copy.
