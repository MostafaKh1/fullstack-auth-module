# 06: API hardening and documentation

**Status:** ready-for-agent
**Blocked by:** 03, 05
**Spec:** [auth-module](../spec/auth-module.md)

**What to build:** the API slows down brute force, sends security headers, allows only configured origins, and documents itself interactively.

- [ ] Sign up and Sign in are throttled per IP and answer `429` `request.rate_limited` past the limit
- [ ] `helmet` headers are present; CORS allows only configured origins, with credentials
- [ ] Oversized request bodies are rejected
- [ ] Swagger UI at `/api/docs` documents every route, its request schema, its success response and its error codes, and can call the protected endpoint with a Bearer token
