# Spec: Feature folders for the contract and the front end

## Problem Statement

A feature's code is scattered. In the front end, Sign up and Sign in live across eight folders sorted by kind: the screen under the composite components, the route guards and switches under layout, the Session hook, provider and context in the shared hooks and providers, the auth URL helpers in shared utils, and the pages. Adding, changing or deleting a feature means touching all of them, and nothing tells a reader which code belongs to one feature and which is shared. The form's own plumbing (its two contexts and its field hook) sits in the shared folders though only the Form component uses it.

The contract has the same problem on a smaller scale. It is one flat folder mixing each feature's procedures, the shared error envelope, and rules only Sign up and Sign in use. The auth procedures already import the User shape from the users procedures, and nothing stops one feature depending on another. Every protected route repeats its security setting by hand.

## Solution

Both the contract and the front end take the shape the back end already has: what several features share lives in one shared place, organised by kind, and each feature's own code lives in a folder of its name. A new feature is one new folder plus one line where it is registered, and it can be deleted the same way. A feature may use shared code but never another feature, and lint and the structure check enforce that. The import paths name a feature or the shared area, never the internal layout. Every architecture doc describes the new layout and its rules.

## User Stories

1. As a developer adding a feature, I want one folder for its procedures in the contract, so that I add it in one place and register it with one line.
2. As a developer, I want the shared contract pieces (the error envelope, the User shape, the route-security helpers) in one shared area, so that I can tell shared from feature-owned at a glance.
3. As a developer, I want the field rules and their worked examples under the auth feature, so that they sit with the procedures that use them.
4. As a developer, I want the User shape defined once in the shared area, so that the auth and users procedures return the same shape without one importing the other.
5. As a developer, I want to mark a route public, bearer-protected or cookie-protected in one word, so that its OpenAPI security entry and the shared 401 are never written by hand.
6. As a developer, I want imports to read `@app/contract/<feature>/<file>` or `@app/contract/common/<file>`, so that the package's internal layout never leaks into the apps.
7. As a maintainer, I want lint to reject a contract feature importing another feature, so that features stay independent.
8. As a front-end developer, I want everything auth owns (its screen, route guards, route switches, Session hook, provider and context, URL helpers) in one feature folder, so that I change auth in one place.
9. As a front-end developer, I want a feature folder to repeat the shared kind folders under the same naming rules, so that I already know where a file goes inside it.
10. As a front-end developer, I want the oRPC client, the access token, the session refresh and the API error helpers to stay shared, so that the client every feature uses depends on no feature.
11. As a front-end developer, I want the Form component's contexts and field hook inside the Form folder, so that the shared hooks and providers hold only what several parts of the app use.
12. As a maintainer, I want the structure check to reject a feature importing another feature, and shared code importing any feature, so that the boundaries hold without review.
13. As a maintainer, I want pages to stay the route tree and stay thin, so that routing and feature code remain separate.
14. As a maintainer, I want no empty feature folders, so that every folder holds code.
15. As an agent or new developer, I want the architecture docs (the contract's, the front end's, the root's and the coding standards) to describe the new layout, the import rules and where a new file goes, so that I follow the architecture without reading the code first.
16. As a maintainer, I want ADR 0006 and ADR 0012 amended, so that the recorded decisions match the code.
17. As a User, I want Sign up, Sign in, the Application page and Sign out to behave exactly as before, so that the change is invisible to me.
18. As an API consumer, I want the API and its document unchanged, so that nothing I depend on moves.

## Implementation Decisions

- **The contract's layout**: the router at the package root, a shared area for the error envelope, the User shape and the route-security helpers, and one folder per feature (auth, users, health). The auth folder holds its procedures, its field rules and their worked examples, with names that carry the feature's prefix.
- **The route-security helpers**: three helpers, for public, bearer-protected and cookie-protected routes. Each sets the route's OpenAPI security entry, and the protected ones also declare the shared `auth.unauthenticated` 401. Every route still declares its other errors itself. Nothing beyond those three is added.
- **The contract's import paths**: the package exports the router as `@app/contract`, the shared area as `@app/contract/common/<file>`, and each feature as `@app/contract/<feature>/<file>`. The feature-folder level never appears in an import. Every importer in both apps is updated.
- **The contract's boundary**: lint rejects an import from one contract feature into another, so a feature imports only the shared area. A planted import proves the rule fails.
- **The front end's feature folders**: a feature's code lives under its own folder in a features area, which repeats the shared kind folders (components with their sections and kinds, hooks, providers, utils) under the existing naming rules.
- **What moves into the auth feature**: the auth screen, the two route guards, the two route switches, the Session hook, provider and context, and the auth URL and return-to helpers.
- **What stays shared**: the oRPC client and its access token, session refresh and API error helpers (the client depends on them), the error copy, `cn`, the theme provider and toggle, and the page loader.
- **No users feature folder yet**: the Application page loads the current User inline, so there is nothing to move. The folder is created when it first has code.
- **Form plumbing**: the Form component's field context, item context and field hook move into its own component folder, named with its prefix.
- **The front end's import rules**, enforced by the structure check:
  - a feature imports from the shared folders and from inside itself, never from another feature;
  - shared folders import no feature;
  - the app shell and pages may import features.
- **Pages**: they stay the route tree, each one thin and composing a feature's components.
- **Docs**:
  - The contract's, front end's and root architecture notes, and the coding standards, describe the new layout, the import rules, where a new file goes, and that a new feature is a new folder.
  - They list no files, as the docs rule requires.
  - A search for every old path finds nothing in the docs.
  - ADR 0006 and ADR 0012 carry their amendments. These are already written and land as the branch's first commit.
  - No glossary change.

## Testing Decisions

- **The safety net:** moving files changes no behaviour, so the existing seams cover it:
  - the back end's HTTP suites;
  - the front end's rendered-app suite with MSW;
  - the Playwright journeys.

  They must all pass after each ticket, and a test may change only its import paths.

- **New rules are new behaviour and get red tests first:**
  - The front end's import rules: new cases in the structure check's own test suite, which runs the check on fixture trees. Each case covers a feature importing another feature, shared code importing a feature, and a feature folder breaking the naming rules. They are committed red before the check enforces them.
  - The contract's boundary rule: a planted cross-feature import must make lint fail before it is removed. This is how the back end's import plugins were proven.
- **The API document:** generating it from the contract must produce the same `openapi.json`, and the contract check in CI must pass with the file unchanged.
- **Prior art:**
  - the structure check's existing test suite;
  - the back end's lint plugins and their planted-import proofs;
  - the API docs suite.

## Out of Scope

- Any change to behaviour, routes, the API document, the error envelope or what a User sees.
- A users feature folder in the front end, until it has code.
- Moving the oRPC client or its helpers into a feature.
- Restructuring the back end, which already has this shape.
- New features.

## Further Notes

- Two tickets, run in order:
  1. The contract's layout, together with every import of it in both apps.
  2. The front end's layout, which waits on the first so the two never edit the same imports at once.

  Both are labelled `model:sonnet` and `effort:medium`.

- ADR 0006's amendment and ADR 0012's paragraph are already written in the working tree, and they land as the integration branch's first commit.
