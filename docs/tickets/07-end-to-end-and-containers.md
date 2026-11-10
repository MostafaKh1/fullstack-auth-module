# 07: End-to-end journeys and containers

**Status:** ready-for-agent
**Blocked by:** 05
**Spec:** [auth-module](../spec/auth-module.md)

**What to build:** a real browser proves the whole stack works together, in CI as well as locally, and the stack can run in containers.

- [ ] Playwright journey: Sign up -> Application page -> reload -> Sign out -> Sign in -> Application page
- [ ] Playwright journey: Sign in with a wrong password shows the generic message
- [ ] The Playwright suite runs in CI against both apps and a MongoDB service
- [ ] Each app has a production Dockerfile; `docker compose` can run the full stack
