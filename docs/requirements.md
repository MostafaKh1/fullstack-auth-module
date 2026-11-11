# Requirements

The brief this repository answers, kept verbatim, followed by the clarifications that turn its ambiguous parts into testable rules, and a checklist that maps each requirement to the code and test that satisfy it.

## The brief (verbatim)

> **Full Stack Test Task**
>
> **Task description**
>
> Implement a module that allows a user to sign up and sign in to the application. The application should be production-ready and adhere to industry best practices for both front-end and back-end development.
>
> **Front-end development:**
>
> Requirements:
>
> - Develop the user authentication module using either the React or Vue framework.
> - Design elements are open to your creativity.
> - You must use TypeScript.
> - You have the flexibility to choose any additional modules or libraries (including design frameworks) if necessary.
>
> Sign up page:
>
> Create a signup form with the following fields:
>
> - Email: Valid email format validation.
> - Name: Minimum of 3 characters.
> - Password: Password requirements are as follows:
>   - Minimum length of 8 characters.
>   - At least one letter.
>   - At least one number.
>   - At least one special character.
>
> Sign in page:
>
> Create a sign-in form with fields for:
>
> - Email
> - Password
>
> Application page:
>
> Create a page that displays the following:
>
> - A welcome message: "Welcome to the application."
> - (Optional) Add a logout button to end the session.
>
> **Back-end development:**
>
> Technical stack requirements:
>
> - Implement the back-end endpoints using the NestJS framework and integrate MongoDB as the database.
> - Add at least one protected endpoint.
> - Add a readme file with basic information on how to work with the repo.
> - You can choose the appropriate ORM and other libraries if needed.
>
> Notes:
>
> Build API endpoints to sign up and sign in users to the application, taking into account the requirements to the fields described in the Front-end part.
>
> **Submission:**
>
> Once completed, create a public GitHub repository and push your code to it. Share the repository link with the recruiter.
>
> Include an AI.md file in your repository describing how you used AI assistance: which parts of the code were AI-assisted, what prompts or approaches were effective, and what you had to correct or rework. This is not optional.
>
> **Scoring Criteria**
>
> Submissions will be evaluated based on:
>
> 1. Functionality: Does the application meet the requirements?
> 2. Production-Readiness: Is the code secure, and maintainable?
> 3. Code Quality: Is the code clean, modular, and easy to understand?
> 4. Delivery Speed: This task is designed to be completed in a few hours. Submissions that demonstrate efficient, confident execution will be rated higher.
> 5. Bonus Points: For implementing optional features like Logging, Error handling, testing, basic CI/CD or API documentation.
>
> **AI Usage Policy & Guidelines**
>
> We are looking for engineers who use AI as a force multiplier. AI assistance is not just permitted, it is expected. What we are evaluating is the quality of your judgement on top of it: what you chose to generate, what you adapted, and what you decided to do differently.
>
> What good AI-first engineering looks like here:
>
> - Use AI to move fast on scaffolding, boilerplate, and validation logic, then verify and own the output.
> - Your AI.md should go beyond disclosure. Tell us which prompts worked well, where the output needed fixing, and any decisions you made differently than what AI suggested.
> - Speed is a signal. A strong candidate should _(the brief as received ends here)_

## Clarifications

Where the brief is ambiguous, these are the rules the implementation follows.
Each one is enforced on both the front end and the back end.

### Email

- A practical format check, equivalent to the browser's `type="email"`.
- Leading and trailing whitespace is trimmed; the address is stored lowercased, so `Ada@X.com` and `ada@x.com` are the same User.
- At most 254 characters.
- Unique: one User per email.

### Name

- At least 3 characters **after trimming**, so `"  ab  "` is rejected.
- At most 50 characters.
- Any script is allowed (`"李小龍"` is valid); control characters are not.

### Password (sign up)

- 8 to 128 characters.
- At least one **letter**: any Unicode letter (`é` counts).
- At least one **number**: a digit 0-9.
- At least one **special character**: anything that is not a letter, a number or whitespace (`!`, `_`, `€`, `🙂` count; a space does not).
- Never trimmed; a space is a legitimate password character.
- Example: `Passw0rd!` is valid, `Password1` is not.

### Sign in

- Checks only that the email is well-formed and the password is non-empty; the sign-up password policy is not re-applied.
- Every failure returns the same message, "Invalid email or password", so the form never reveals whether an email is registered.

### Sign up

- An email that is already taken is reported plainly: "An account with this email already exists".
  Rate limiting is the mitigation for the enumeration this allows; there is no email verification step to hide behind.
- A successful sign up signs the User in immediately and lands on the Application page.

### Application page

- Shows the exact heading "Welcome to the application.", with a secondary "Signed in as {name}" line.
- Reachable only while signed in; anyone else is redirected to Sign in and returned to the page afterwards.
- A signed-in User who opens Sign in or Sign up is redirected to the Application page.
- Sign in and Sign up are addressed as `/?auth=sign-in` and `/?auth=sign-up` on the application's root URL. The return path travels as `returnTo` and is followed only when it is a same-site path, so it cannot be used as an open redirect ([ADR 0009](adr/0009-auth-forms-addressed-by-search-parameter.md)).
- A page reload keeps the User signed in.

### Sign out

- Implemented (the brief marks it optional).
- Ends the session on the server, not only in the browser.

### Protected endpoint

- `GET /api/users/me` returns the signed-in User's id, email, name and sign-up date.
- The Application page reads the User's name from it, so the endpoint is exercised by the product rather than present for show.

## Out of scope, by choice

Email verification, password reset, "remember me", social sign-in, a signed-in-devices list, and account deletion.

## Delivery

- The brief allows "a few hours"; scope is held to that.
- Work lands one ticket at a time, each closed by a Conventional Commit.
- `AI.md` is written incrementally, one entry per ticket, rather than reconstructed at the end.
- The repository is pushed to a public GitHub repository at the end.

## Traceability

Every path is from the repository root; `*` and `**` are globs. Back-end tests live in `backend/src/test/`, front-end tests beside their pages or in `frontend/src/tests/`, and the browser journeys in `e2e/tests/`.

| Requirement                               | Implemented in                                                                                                                                                                                                                                                                                                                                              | Verified by                                                                                                                                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React or Vue, TypeScript                  | `frontend/` (React 19, Vite, strict TypeScript): `frontend/src/main.tsx`, `frontend/src/app/App.tsx`, ADR 0006                                                                                                                                                                                                                                              | `npm run typecheck --prefix frontend` (`tsc -b`) and the front-end suites below                                                                                                                                                 |
| Sign up form: email, name, password rules | `/?auth=sign-up`: `frontend/src/pages/(auth)/sign-up/SignUpPage.tsx`, `frontend/src/components/composite/screens/AuthScreen/AuthScreenSignUpForm/AuthScreenSignUpForm.tsx`, the rules in `frontend/src/components/composite/screens/AuthScreen/AuthScreenFieldRules.ts`                                                                                     | `frontend/src/pages/(auth)/sign-up/SignUpPage.test.tsx`, which runs every row of `frontend/src/components/composite/screens/AuthScreen/AuthScreenFieldRules.examples.ts`                                                        |
| Sign in form: email, password             | `/?auth=sign-in`: `frontend/src/pages/(auth)/sign-in/SignInPage.tsx`, `frontend/src/components/composite/screens/AuthScreen/AuthScreenSignInForm.tsx`                                                                                                                                                                                                       | `frontend/src/pages/(auth)/sign-in/SignInPage.test.tsx`; `e2e/tests/journeys.spec.ts`                                                                                                                                           |
| Application page with the welcome message | `/`: `frontend/src/pages/(webapp)/application/ApplicationPage.tsx`; the redirects and `returnTo`: `frontend/src/app/routes.tsx`, `frontend/src/components/layout/route-guards/`, `frontend/src/utils/return-to.ts`, ADR 0009; reload: `frontend/src/providers/SessionProvider.tsx`                                                                          | `frontend/src/pages/(webapp)/application/ApplicationPage.test.tsx` (including the rows of `frontend/src/utils/return-to.examples.ts`); `e2e/tests/journeys.spec.ts` (reload)                                                    |
| Sign out ends the session                 | `POST /api/auth/sign-out`: `backend/src/features/auth/auth.controller.ts`, `backend/src/features/auth/services/auth.service.ts`, `backend/src/features/auth/services/session.service.ts`; the button: `frontend/src/pages/(webapp)/application/ApplicationPage.tsx`, `frontend/src/providers/SessionProvider.tsx`                                           | `backend/src/test/sign-out.spec.ts`; `frontend/src/pages/(webapp)/application/ApplicationPage.test.tsx`; `e2e/tests/journeys.spec.ts`                                                                                           |
| NestJS + MongoDB                          | `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/src/database/` (Mongoose collections and repositories), `compose.yaml`, ADR 0005                                                                                                                                                                                                               | `backend/src/test/harness.spec.ts` and `backend/src/test/health.spec.ts` (against a throwaway `mongod`); `e2e/tests/journeys.spec.ts`                                                                                           |
| Sign up and sign in endpoints, same rules | `POST /api/auth/sign-up`, `POST /api/auth/sign-in`: `backend/src/features/auth/` (`backend/src/features/auth/auth.controller.ts`, rules in `backend/src/features/auth/auth.types.ts` applied by `backend/src/common/pipes/route-validation.pipe.ts`); passwords per ADR 0007; refresh per ADR 0001: `backend/src/features/auth/services/session.service.ts` | `backend/src/test/sign-up.spec.ts`, `backend/src/test/sign-in.spec.ts` and `backend/src/test/refresh.spec.ts`, with the table `backend/src/test/support/field-rules.examples.ts` that the front end's table mirrors             |
| At least one protected endpoint           | `GET /api/users/me`: `backend/src/features/users/users.controller.ts`, guarded by `backend/src/common/guards/access-token.guard.ts`; read by `frontend/src/pages/(webapp)/application/ApplicationPage.tsx` through `frontend/src/utils/users-api.ts`                                                                                                        | `backend/src/test/current-user.spec.ts`; `frontend/src/pages/(webapp)/application/ApplicationPage.test.tsx`                                                                                                                     |
| README                                    | `README.md`                                                                                                                                                                                                                                                                                                                                                 | Reviewed against its ticket; the commands in it were run, and the ones that were not are named in the ticket's `AI.md` entry                                                                                                    |
| AI.md                                     | `AI.md`                                                                                                                                                                                                                                                                                                                                                     | Reviewed against the brief: what was AI-assisted, what worked, what was corrected, what was decided differently                                                                                                                 |
| Bonus: logging                            | `backend/src/logging/logging.module.ts` (pino, redaction), `backend/src/logging/request-id.ts`                                                                                                                                                                                                                                                              | `backend/src/test/logging.spec.ts`, `backend/src/test/errors-and-request-id.spec.ts`                                                                                                                                            |
| Bonus: error handling                     | `backend/src/common/filters/all-exceptions.filter.ts`, `backend/src/common/errors/`, ADR 0002; front end: `frontend/src/utils/error-copy.ts`, `frontend/src/utils/api-error.ts`                                                                                                                                                                             | `backend/src/test/errors-and-request-id.spec.ts`, `backend/src/test/hardening.spec.ts`; the failure rows of `frontend/src/pages/(auth)/sign-up/SignUpPage.test.tsx` and `frontend/src/pages/(auth)/sign-in/SignInPage.test.tsx` |
| Bonus: testing                            | Three seams, ADR 0004: back-end HTTP tests, front-end rendered-app tests (MSW), Playwright journeys                                                                                                                                                                                                                                                         | `backend/src/test/*.spec.ts`, `frontend/src/**/*.test.tsx`, `e2e/tests/journeys.spec.ts`                                                                                                                                        |
| Bonus: CI/CD                              | `.github/workflows/ci.yml` (lint, contract, per-app typecheck, test and build, journeys and container health), `backend/Dockerfile`, `frontend/Dockerfile`, `compose.yaml`                                                                                                                                                                                  | The workflow itself on each pull request; `docker compose up --build --detach --wait` in its `e2e` job                                                                                                                          |
| Bonus: API documentation                  | Swagger UI at `/api/docs`: `backend/src/docs/api-document.ts`; the exported `contract/openapi.json` (`backend/src/docs/export-openapi.ts`)                                                                                                                                                                                                                  | `backend/src/test/api-docs.spec.ts`; the `contract` CI job (`npm run openapi:check --prefix backend`)                                                                                                                           |
