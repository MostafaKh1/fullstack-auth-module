# A Session record with a short-lived access token

A Session is a document in MongoDB and is the authority on whether a User is signed in.
The browser holds two credentials: a 15 minute access token (JWT carrying `sub` and `sid`) kept in memory and sent as `Authorization: Bearer`, and a refresh credential `<sessionId>.<secret>` in an `httpOnly`, `SameSite=Lax` cookie scoped to `/api/auth`.
Only `sha256(secret)` is stored, every refresh replaces the secret in one conditional update, and presenting the immediately previous secret revokes the Session - except within a 10 second grace window, so two tabs refreshing at once do not sign the User out.

## Considered options

- **One JWT in `localStorage`.** Least code, but any injected script can read a durable credential, and Sign out cannot end anything on the server.
- **One long-lived JWT in an `httpOnly` cookie.** Not script-readable, but still unrevocable before expiry, so Sign out would only be cosmetic.
- **An opaque session id in a cookie, checked on every request.** Revocable, but every request costs a database read.

## Consequences

- The guard checks that the access token's Session (`sid`) is not revoked, one indexed read per protected request, so Sign out takes effect immediately rather than after the token's remaining lifetime. Dropping that read is the lever if request volume ever makes it costly.
- The access token lives in memory, so a reload has no token; the front end restores the Session by calling `POST /api/auth/refresh` on boot, which the cookie makes possible.
- A refresh accepted within the grace window issues an access token but no new cookie: the cookie the rotating response set stays current, whichever of the two responses the browser applies last.
- The cookie only travels to `/api/auth/*`, and those routes also check `Origin`, so the cookie cannot be used for cross-site request forgery against the rest of the API.
- Only the previous secret, replayed after the grace window, revokes a Session (`reuse-detected`); any other wrong secret answers `401 auth.session_expired` and changes nothing. The Session id is not a secret: it is a MongoDB ObjectId (a timestamp and a counter), guessable, and readable by anyone holding the access token, so revoking on a wrong secret would let anyone sign any User out. Matching the previous secret is safe because only a holder of a real credential has it, and a credential presented again after it was replaced means two parties hold it. The cost is that a credential older than the previous one is not recognised as stolen, since its hash is no longer kept: it is refused like a guess, and it cannot be used.
