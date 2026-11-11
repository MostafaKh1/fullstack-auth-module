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
- Work lands in stages, one Conventional Commit per stage: scaffold, back end, front end, tests and CI, docs.
- `AI.md` is written incrementally, one entry per stage, rather than reconstructed at the end.
- The repository is pushed to a public GitHub repository at the end.

## Traceability

| Requirement                               | Implemented in                                                                                                                            | Verified by                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| React or Vue, TypeScript                  |                                                                                                                                           |                            |
| Sign up form: email, name, password rules | `/?auth=sign-up`: `frontend/src/pages/(auth)/sign-up/SignUpPage.tsx`                                                                      | `SignUpPage.test.tsx`      |
| Sign in form: email, password             | `/?auth=sign-in`: `frontend/src/pages/(auth)/sign-in/SignInPage.tsx`                                                                      | `SignInPage.test.tsx`      |
| Application page with the welcome message | `/`: `frontend/src/pages/(webapp)/application/ApplicationPage.tsx`; the redirects and `returnTo`: `frontend/src/app/routes.tsx`, ADR 0009 | `ApplicationPage.test.tsx` |
| Sign out ends the session                 |                                                                                                                                           |                            |
| NestJS + MongoDB                          |                                                                                                                                           |                            |
| Sign up and sign in endpoints, same rules |                                                                                                                                           |                            |
| At least one protected endpoint           |                                                                                                                                           |                            |
| README                                    |                                                                                                                                           |                            |
| AI.md                                     |                                                                                                                                           |                            |
| Bonus: logging                            |                                                                                                                                           |                            |
| Bonus: error handling                     |                                                                                                                                           |                            |
| Bonus: testing                            |                                                                                                                                           |                            |
| Bonus: CI/CD                              |                                                                                                                                           |                            |
| Bonus: API documentation                  |                                                                                                                                           |                            |
