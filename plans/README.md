# Plans

Durable, version-controlled engineering plans.
A plan is a single Markdown file that moves between stage folders as its status changes.

| Stage       | Folder               | Meaning                                                       |
| ----------- | -------------------- | ------------------------------------------------------------- |
| Proposed    | `plans/proposed/`    | Drafted, not yet approved for implementation.                 |
| In progress | `plans/in-progress/` | Approved and being implemented.                               |
| Completed   | `plans/completed/`   | Shipped and verified; kept as a record of what was done, why. |
| Archived    | `plans/archived/`    | Superseded or dropped; kept so the history stays legible.     |

## Conventions

- One plan per file, named in kebab-case after the initiative.
- Start with a status header: `Status`, `Stage`, `Owner`, `Branch of record`, `Created`.
- Break the work into numbered stages with checkboxes, and check items off as they land and stay verified.
- Use absolute dates (`2026-11-10`, not "today").

## Working a plan

1. Read the plan end to end before touching code.
2. Implement one stage at a time; a stage is done when lint, typecheck, tests and build are green.
3. Commit the code and the updated checkboxes together.
4. When the plan ships, `git mv` it to `plans/completed/` and flip its `Status`.
