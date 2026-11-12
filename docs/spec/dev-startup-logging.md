# Spec: Show where the apps are running at start-up

## Problem Statement

When a developer runs `npm run dev`, the terminal never says where the API is listening or where its API docs are. The back end logs nothing once it starts listening, and every back-end log line is one JSON object, which is hard to read in a terminal. The front end's address line is printed, but it is lost among the back end's JSON lines.

## Solution

Once the API is listening, it logs one `app.listening` event naming its URL and its Swagger docs URL, in every environment. In development only, the back end's logs are pretty-printed, so that line and every other one are readable in the terminal. Under test and in production the logs stay JSON, which is what log tooling and the test harness read.

## User Stories

1. As a developer, I want the API to log the address it listens on once it has started, so that I know where to send requests.
2. As a developer, I want the start-up line to include the Swagger docs URL, so that I can open the API docs without looking up the path.
3. As a developer, I want the start-up line to appear only after the API is actually listening, so that seeing it means the server is ready.
4. As a developer, I want the URLs to use `localhost` and the configured port, so that I can click them in my terminal.
5. As a developer running `npm run dev`, I want the back end's logs pretty-printed, so that I can read them at a glance.
6. As a developer, I want request logs in development pretty-printed too, so that I can follow what the API is doing while I click through the app.
7. As an operator, I want production logs to stay one JSON object per line, so that my log tooling can parse them.
8. As an operator, I want the `app.listening` event in production as well, so that I can confirm the process started and which port it took.
9. As an operator, I want the production image to carry no pretty-printing package, so that the image stays small and has no development-only dependency.
10. As a maintainer, I want the test environment's logs to stay JSON, so that the test harness can keep reading log lines back as objects.
11. As a maintainer, I want the start-up event named with the project's dotted event convention, so that it reads like every other log event.
12. As a maintainer, I want the choice of log format made in the one place pino is configured, so that there is one switch to find.
13. As a maintainer, I want the choice of format driven by the validated configuration, so that the environment is still read in one place only.
14. As a developer, I want a failed start (invalid configuration) still logged as before, so that this change does not alter how start-up errors look.
15. As a reviewer, I want the `app.listening` event covered by a test that starts the real entry point, so that a regression is caught in CI.

## Implementation Decisions

- **The start-up event**: the entry point, after the server is listening, logs an `info` event named `app.listening` through the application's pino logger, with exactly two fields: `url` (`http://localhost:<PORT>/api`) and `docs` (`http://localhost:<PORT>/api/docs`), both built from the configured `PORT`. It is logged in every environment. Swagger is served in every environment, so `docs` is always a real address.
- **Why `localhost`**: the server listens on every interface, so it has no single real address; the public address behind a reverse proxy is configured outside the API, which cannot know it. In a container the line still confirms the port and that the process is up.
- **Pretty-printing**: `pino-pretty` becomes a back-end devDependency. The logging module, the one place pino is configured, enables it as a pino transport only when the configured environment is `development`. `test` and `production` keep the default JSON output; the redact list applies to both formats unchanged.
- **The production image**: it installs no devDependencies, and production never asks for the transport, so the image cannot fail on the missing package.
- **Start-up failures**: the bare pino logger that reports `config.invalid` and `boot.failed` before the configuration exists is unchanged and stays JSON: pretty-printing it would need the environment read outside the configuration module.
- **Docs**: the back end's architecture notes on logging gain one line saying development output is pretty-printed and every other environment logs JSON. No glossary term and no ADR: the change is easy to reverse and unsurprising.

## Testing Decisions

- A good test here checks what the process prints, not how the logger is wired: start the real entry point and read its output.
- **Seam**: the existing boot-time suite that starts the real entry point as a child process (`configuration.spec.ts`), the same seam its invalid-configuration cases use. No new seam.
- **The new case**: start the entry point with a valid test configuration (a free port found before the start, never 0, since the URLs are built from the configured port; the harness's throwaway MongoDB), wait for a JSON line whose message is `app.listening`, assert its `url` and `docs` fields against the configured port, then stop the process. It is committed red before the log call exists.
- **Pretty-printing is not tested automatically**: it changes only how output looks, in development only. The ticket checks it by hand with `npm run dev` and records that in `AI.md`.
- Existing suites prove the test environment stays JSON: the harness's log reader parses every line.

## Out of Scope

- Changing the front end's or Vite's output.
- Any log field beyond `url` and `docs` on the start-up event.
- Pretty-printing the start-up failure messages (`config.invalid`, `boot.failed`).
- A configurable public URL for the start-up event.

## Further Notes

One small ticket, `model:sonnet`, `effort:low`.
