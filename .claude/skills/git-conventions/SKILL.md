---
name: git-conventions
description: >-
  Name a git branch or write a commit message or pull request description for
  this repo, following Conventional Commits v1.0.0. Use whenever creating a
  branch, committing, or opening a PR.
---

# Git conventions

## Commit messages

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- Types: `feat`, `fix`, `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, `revert`.
- Scope, when one applies, is the app: `feat(backend): ...`, `fix(frontend): ...`. Omit it for a change that spans both or neither.
- The description is imperative, lowercase, with no trailing period: `feat(backend): sign up endpoint`.
- The body explains _why_, wrapped at 72 columns.
- A commit that completes a ticket closes its GitHub issue with a footer: `Closes #3`.
- A breaking change uses `!` before the colon or a `BREAKING CHANGE:` footer.

## Branches

`<type>/<short-kebab-description>`, using the commit types: `feat/sign-in`, `fix/refresh-race`.

## Pull request descriptions

- **Title**: one Conventional Commits line describing the outcome, not the areas touched.
- **Body**: a one-line lead-in, then outcome bullets in commit order. Group related commits into one bullet, describe the effect from the reader's side, and drop bookkeeping (checkbox flips, typo fixes) unless it changes behaviour.
