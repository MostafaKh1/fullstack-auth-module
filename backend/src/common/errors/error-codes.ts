/** The closed set of API error codes (ADR 0002), each with its HTTP status and whether retrying may succeed. */
export const ERROR_CODES = {
  "request.validation_failed": { status: 400, retryable: false },
  "request.malformed": { status: 400, retryable: false },
  "request.too_large": { status: 413, retryable: false },
  "request.rate_limited": { status: 429, retryable: true },
  "auth.unauthenticated": { status: 401, retryable: false },
  "auth.invalid_credentials": { status: 401, retryable: false },
  "auth.session_expired": { status: 401, retryable: false },
  "auth.origin_rejected": { status: 403, retryable: false },
  "route.not_found": { status: 404, retryable: false },
  "user.email_taken": { status: 409, retryable: false },
  "server.internal": { status: 500, retryable: false },
  "server.unavailable": { status: 503, retryable: true },
} as const satisfies Record<string, { status: number; retryable: boolean }>;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * One field-level problem: `path` is the keys from the body down to the field (`["password"]`), `code` is a rule id
 * such as `password.missing_number`.
 */
export type ValidationIssue = { path: (string | number)[]; code: string };

/** The body of every error response. */
export type ErrorEnvelope = {
  code: ErrorCode;
  status: number;
  traceId: string;
  retryable: boolean;
  issues?: ValidationIssue[];
  message?: string;
};
