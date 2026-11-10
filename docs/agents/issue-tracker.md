# Issue tracker: committed Markdown

Specs, tickets and retros live as Markdown files committed in this repo, so the whole process is reviewable alongside the code.

## Layout

- Spec: `docs/spec/<feature-slug>.md`
- Tickets: `docs/tickets/<NN>-<slug>.md`, one ticket per file, numbered from `01` in dependency order (blockers first)
- Retros: `docs/retro/<YYYY-MM-DD>-<slug>.md`

## Ticket header

Each ticket carries these lines near the top:

- `Status:` one of `ready-for-agent`, `in-progress`, `done`
- `Blocked by:` ticket numbers (`01, 03`), or `None`
- `Spec:` a relative link to the spec it implements

A ticket is unblocked when every ticket it lists is `done`.
The **frontier** is every unblocked ticket that is still `ready-for-agent`; take the lowest number first.

## Operations

- **Publish a spec or ticket**: write the file at the path above, creating the directory if needed.
- **Fetch a ticket**: read the file at the path or number the user gives.
- **Claim a ticket**: set `Status: in-progress` before writing code.
- **Comment**: append under a `## Comments` heading at the bottom of the file.
- **Close a ticket**: check off its acceptance criteria, set `Status: done`, and commit that edit together with the code that satisfies it.
  The commit message references the ticket as a footer: `Refs: docs/tickets/<NN>-<slug>.md`.
