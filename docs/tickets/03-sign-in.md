# 03: Sign in

**Status:** ready-for-agent
**Blocked by:** 02
**Spec:** [auth-module](../spec/auth-module.md)

**What to build:** a returning User signs in with email and password and lands on the page they were headed for; any wrong combination gets one generic message; signed-in Users are kept off the Sign in and Sign up pages.

- [ ] `POST /api/auth/sign-in` creates a new Session for valid credentials, with the same response and cookie as Sign up
- [ ] An unknown email and a wrong password both return `401` `auth.invalid_credentials`, with comparable response times
- [ ] Sign in does not apply the Sign up password policy
- [ ] Opening the Application page signed out redirects to Sign in, and a successful Sign in returns there
- [ ] A signed-in User opening Sign in or Sign up is redirected to the Application page
- [ ] The two pages link to each other
