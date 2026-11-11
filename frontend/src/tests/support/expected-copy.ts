import type { components } from "../../utils/api-types.generated";

type ContractErrorCode = components["schemas"]["ErrorEnvelope"]["code"];

type Contract = { components: { schemas: { ErrorEnvelope: { properties: { code: { enum: string[] } } } } } };

// Read from the contract at run time, so a code the back end adds fails the page tests even before the types are
// regenerated; `import.meta.glob` is Vite's, so the app's TypeScript settings need no JSON support.
const [contract] = Object.values(
  import.meta.glob<Contract>("../../../../contract/openapi.json", { eager: true, import: "default" }),
);

/** Every error code in the closed set, as `contract/openapi.json` lists it. */
export const contractErrorCodes: string[] =
  contract?.components.schemas.ErrorEnvelope.properties.code.enum ?? [];

// Typed against the generated contract too, so a missing code also fails the typecheck. The sentences for
// `auth.invalid_credentials` and `user.email_taken` are quoted verbatim from docs/requirements.md.
export const expectedErrorCopy: Record<string, string> = {
  "request.validation_failed": "Some fields need attention. Check them, then try again.",
  "request.malformed": "That request could not be read. Reload the page, then try again.",
  "request.too_large": "That request was too large to send.",
  "request.rate_limited": "Too many attempts. Wait a minute, then try again.",
  "auth.unauthenticated": "Your session has ended. Please sign in again.",
  "auth.invalid_credentials": "Invalid email or password",
  "auth.session_expired": "Your session has ended. Please sign in again.",
  "auth.origin_rejected": "This request did not come from this application. Reload the page, then try again.",
  "route.not_found": "That could not be found. Reload the page, then try again.",
  "user.email_taken": "An account with this email already exists",
  "server.internal": "Something went wrong on our side. Please try again.",
  "server.unavailable": "The service is temporarily unavailable. Please try again shortly.",
} satisfies Record<ContractErrorCode, string>;

/** The sentence for each rule id and error code, written out independently of the app's copy map. */
export const expectedCopy: Record<string, string> = {
  "field.required": "This field is required.",
  "email.invalid": "Enter a valid email address, like name@example.com.",
  "email.too_long": "Email must be at most 254 characters.",
  "name.too_short": "Name must be at least 3 characters.",
  "name.too_long": "Name must be at most 50 characters.",
  "name.invalid_characters": "Name cannot contain control characters or line breaks.",
  "password.too_short": "Password must be at least 8 characters.",
  "password.too_long": "Password must be at most 128 characters.",
  "password.missing_letter": "Password must contain at least one letter.",
  "password.missing_number": "Password must contain at least one number.",
  "password.missing_special": "Password must contain at least one special character, such as ! or €.",
  ...expectedErrorCopy,
};

export const unreachableCopy = "We cannot reach the server. Check your connection, then try again.";

export const fallbackCopy = "Something went wrong. Please try again.";
