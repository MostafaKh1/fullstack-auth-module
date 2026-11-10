# Quality gates: Biome lints, Prettier formats, CI gates each app; tests at three agreed seams

Biome lints the whole repository and Prettier formats it, both run from the root with one configuration each (`biome.jsonc`, `.prettierrc.json`: print width 110, double quotes, trailing commas), so the two apps cannot drift apart in style.
Biome's formatter is turned off: Prettier formats Markdown, YAML and HTML as well as code, and two formatters on the same file fight over it.
Biome carries the rules no formatter can: its recommended preset, plus `noConsole` as an error because application code logs only through pino.
A pre-commit hook (Husky and lint-staged) runs Biome's safe fixes and then Prettier on the staged files only, so a commit is fast and a violation Biome cannot fix blocks it.

CI (`.github/workflows/ci.yml`, on pushes to `main` and on pull requests) gates in order: lint (`biome ci` and `prettier --check` over the whole repository), then for each app on its own `npm ci`, typecheck, test and build.
An app's job checks nothing while the app's `package.json` is absent and gates from the commit that creates the app, so CI is green before the apps exist and never silently skips one after.
The hook is a convenience that `--no-verify` can bypass; CI is the gate a reviewer trusts.

Tests live at three agreed seams and nowhere else:

1. **The back end's HTTP API**: the real Nest application, wired as in production, driven over HTTP against a throwaway MongoDB per test file, with a controllable clock and data seeded and inspected through the raw collections.
2. **The front end's rendered app**: the whole app with its router in Vitest and Testing Library, the network faked at the HTTP level with MSW, and any undeclared request failing the test.
3. **A few Playwright journeys** against both real apps and a real database, to catch drift between the apps (paths, cookie scope, the dev proxy, CORS), not edge cases.

The field rules are duplicated in each app ([ADR 0003](0003-two-npm-apps-without-workspace-tooling.md)), so each app keeps a copy of one table of worked examples taken from [docs/requirements.md](../requirements.md); the first two seams run every row, and the copies point at each other so a rule changes in both in the same commit.

## Considered options

- **Biome alone, formatter on.** One tool and faster, but it does not format Markdown or YAML, which would then go unformatted or need Prettier anyway.
- **ESLint and Prettier.** The common pairing, but ESLint needs a plugin per concern (TypeScript, React, imports) and two configs to keep in step across two toolchains; Biome's recommended preset covers the same ground with one dependency.
- **Typecheck and tests in the hook.** Typechecking and testing both apps on every commit is slow enough to invite `--no-verify`; they run in CI instead.
- **Unit tests per class.** They pin the internal structure and break on refactors that keep behaviour; the seams above test what a User and the other app observe.
