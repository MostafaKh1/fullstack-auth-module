# 02: Sign up lands on the Application page

**Status:** ready-for-agent
**Blocked by:** 01
**Spec:** [auth-module](../spec/auth-module.md)

**What to build:** a visitor fills in the Sign up form, sees the password checklist tick off as they type, submits, and lands on the Application page reading "Welcome to the application." with their name, which the page loads from the protected endpoint.

- [ ] `POST /api/auth/sign-up` creates the User and a Session, returns an access token and the User, and sets the refresh cookie with the attributes in the spec
- [ ] Every row of the worked-examples table is accepted or rejected as the requirements say, on both apps; a rejection returns `request.validation_failed` with `issues` per field
- [ ] A taken email returns `409` `user.email_taken`, including under a concurrent duplicate Sign up
- [ ] The password is stored as an argon2id hash and never appears in a response or a log line
- [ ] `GET /api/users/me` returns the User for a valid access token and `401` `auth.unauthenticated` without one; every route is protected unless marked public
- [ ] The Sign up page validates on the client, shows the live checklist, puts server issues on their fields, and maps error codes to copy
- [ ] The Application page shows the welcome heading and "Signed in as {name}", and is reachable only while signed in
