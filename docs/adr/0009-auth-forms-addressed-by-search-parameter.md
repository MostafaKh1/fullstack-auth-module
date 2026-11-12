# Sign in and Sign up addressed by a search parameter on the root URL, with a checked `returnTo`

Sign in and Sign up have no paths of their own: they are `/?auth=sign-in` and `/?auth=sign-up`, the values spelled as the glossary's terms, so every screen of the module lives at the application's one URL and a signed-out visitor at `/` is sent there (history replaced) rather than to a second page; an unknown `auth` value shows Sign in.
The form fills the screen rather than opening as a dialog over the Application page, because the brief asks for Sign up and Sign in pages and a signed-out visitor has nothing behind a dialog to see.
A visitor bounced off a protected page carries it in the URL as `returnTo` (path, search and hash, URL-encoded), and once signed in goes there only when `isSafeReturnTo()` (`frontend/src/features/auth/utils/return-to.ts`) accepts it: a same-site path that starts with `/`, not `//` or `/\`, resolves to no other scheme or host, and carries no `auth` of its own; anything else falls back to `/`. Without that check `returnTo` would be an open redirect: a link to the real site's Sign in that hands the User, just signed in, to a look-alike site of the attacker's choosing.

## Considered options

- **Paths of their own (`/sign-in`, `/sign-up`).** What the module shipped first; it works, but splits one module across three URLs. The old paths now redirect to their new URLs, keeping `returnTo`.
- **A dialog over the Application page.** Rejected: the brief asks for pages, and the page under a dialog would have to render for a visitor who may not see it.
- **The return path in router location state** (ADR 0008's choice). Set only by the app, so it needs no open-redirect check, but it is lost when the URL is copied, bookmarked or opened in another tab. A URL parameter survives all three, at the price of the check above.

## Consequences

- This supersedes ADR 0008's choice of location state for the return path; its guards remain, and still do every redirect. `RequireSignedOut` sends a signed-in User at an auth URL to its safe `returnTo`, otherwise to the same URL with `auth` and `returnTo` removed, whether they just signed in or were already, so the forms still never navigate.
- The safety rule has one implementation and one table of worked examples (`frontend/src/features/auth/utils/return-to.examples.ts`), every row run through a Sign in in the rendered app. Its prefix checks state the rule; resolving the value as a URL catches what a prefix check cannot, such as a tab the URL parser drops from `/\t/evil.example`.
- `auth` in `returnTo` is refused so a User is never returned to a form, and so a redirect cannot chain one auth URL into another.
- The page title follows the visible form (React 19's `<title>`), since the URL path no longer tells a screen reader or the history list which form is showing.
