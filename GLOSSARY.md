# Authentication

The module that lets a person create an identity in the application, prove it later, and use the application while that proof holds.

## Language

**User**:
A person known to the application, identified by a unique email address.
_Avoid_: Account, member, customer

**Sign up**:
Creating a new User from an email, a name and a password; it also signs that User in.
_Avoid_: Register, registration, create account

**Sign in**:
Proving to be an existing User by presenting their email and password.
_Avoid_: Log in, login, authenticate

**Sign out**:
Ending the current Session, so the application no longer accepts it.
Other Sessions of the same User are unaffected.
_Avoid_: Log out, logout

**Session**:
One signed-in period of one User on one device, begun by Sign up or Sign in and ended by Sign out, expiry, or revocation.
A User signed in on a laptop and a phone has two Sessions.
_Avoid_: Login, token, device

**Revocation**:
The application ending a Session on its own, because the Session's credential was presented after it had already been replaced.
_Avoid_: Ban, kick, invalidation

**Application page**:
The page only a signed-in User can see, carrying the welcome message.
_Avoid_: Dashboard, home, landing page
