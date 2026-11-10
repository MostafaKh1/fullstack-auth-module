/**
 * The sentence a User should read for each rule id and error code, written out independently of the app's
 * copy map so a test can catch a wrong or missing entry. The two sentences docs/requirements.md fixes are
 * quoted from it verbatim.
 */
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
  "auth.invalid_credentials": "Invalid email or password",
  "user.email_taken": "An account with this email already exists",
  "request.rate_limited": "Too many attempts. Wait a minute, then try again.",
  "server.internal": "Something went wrong on our side. Please try again.",
};

export const unreachableCopy = "We cannot reach the server. Check your connection, then try again.";

export const fallbackCopy = "Something went wrong. Please try again.";
