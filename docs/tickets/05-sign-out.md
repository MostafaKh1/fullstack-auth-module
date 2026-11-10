# 05: Sign out

**Status:** ready-for-agent
**Blocked by:** 04
**Spec:** [auth-module](../spec/auth-module.md)

**What to build:** a signed-in User presses Sign out on the Application page, the Session ends on the server, and they land on Sign in; their other devices stay signed in.

- [ ] `POST /api/auth/sign-out` revokes the current Session, clears the cookie and returns `204`; it is idempotent
- [ ] An access token for a revoked Session is refused by `GET /api/users/me` immediately
- [ ] Another Session of the same User keeps working
- [ ] The Application page has a Sign out button that ends the Session and redirects to Sign in, and a reload afterwards stays signed out
