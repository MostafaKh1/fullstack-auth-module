/**
 * Every error sentence a User reads, keyed by the API's error code or a field rule id (ADR 0002).
 * A code with no entry reads as `fallbackCopy`; the server's `message` is never shown.
 * A code added to the back end's closed set gets its entry here in the same change.
 */
const copyByCode: Record<string, string> = {
  // Field rule ids (validation issues, and the front end's own schema checks)
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

  // API error codes. The two auth sentences are fixed by docs/requirements.md.
  "auth.invalid_credentials": "Invalid email or password",
  "user.email_taken": "An account with this email already exists",
  "auth.unauthenticated": "Your session has ended. Please sign in again.",
  "auth.session_expired": "Your session has ended. Please sign in again.",
  "request.rate_limited": "Too many attempts. Wait a minute, then try again.",
  "request.too_large": "That request was too large to send.",
  "server.internal": "Something went wrong on our side. Please try again.",
  "server.unavailable": "The service is temporarily unavailable. Please try again shortly.",
};

export const fallbackCopy = "Something went wrong. Please try again.";

/** For a request that got no error envelope back: the server, or the proxy in front of it, is unreachable. */
export const unreachableCopy = "We cannot reach the server. Check your connection, then try again.";

export function errorCopy(code: string): string {
  return Object.hasOwn(copyByCode, code) ? (copyByCode[code] as string) : fallbackCopy;
}
