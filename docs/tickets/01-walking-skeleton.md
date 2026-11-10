# 01: Walking skeleton

**Status:** ready-for-agent
**Blocked by:** None (can start immediately)
**Spec:** [auth-module](../spec/auth-module.md)

**What to build:** both apps start with one command, the front end reaches the back end through the dev proxy, and the back end reports its health, logs structured lines and answers every error with the API error envelope. CI runs every check on a push.

- [ ] Root tooling: npm scripts to run both apps, Biome, Prettier, Husky + lint-staged, `.editorconfig`, `.gitignore`
- [ ] Back end boots with the environment validated at start-up; an invalid environment stops the process with a readable message
- [ ] `GET /api/health` returns `200` with the database `up`, and `503` with `server.unavailable` when it is down
- [ ] An unknown route returns `404` with code `route.not_found` and a `traceId` that matches the request's log line
- [ ] Front end boots with Tailwind, React Router and TanStack Query wired, and shows a placeholder page
- [ ] `docker-compose.yml` runs MongoDB; each app has an `.env.example`
- [ ] GitHub Actions runs lint, typecheck, test and build for both apps
- [ ] `backend/AGENTS.md`, `frontend/AGENTS.md`, the `git-conventions` skill, and the first `AI.md` entry
