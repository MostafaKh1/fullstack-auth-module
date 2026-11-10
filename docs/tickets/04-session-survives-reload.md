# 04: The Session survives reloads and access-token expiry

**Status:** ready-for-agent
**Blocked by:** 02
**Spec:** [auth-module](../spec/auth-module.md)

**What to build:** a signed-in User reloads the page, keeps working past the access token's 15 minutes, or uses two tabs at once, and stays signed in; a replayed refresh credential ends the Session.

- [ ] `POST /api/auth/refresh` rotates the refresh credential and returns a new access token and the User
- [ ] The previous credential is accepted within the 10 second grace window; replaying an older one revokes the Session and returns `auth.session_expired`
- [ ] An expired or revoked Session cannot be refreshed; the idle expiry slides on refresh and never passes the absolute cap
- [ ] The cookie routes reject a foreign `Origin` with `403` `auth.origin_rejected` and accept requests without one
- [ ] On boot the front end restores the Session through refresh behind a loading state, with no flash of the wrong page
- [ ] Concurrent `401`s on the front end trigger one refresh, then each request retries once; a failed refresh signs the User out locally
