import { z } from "zod";

/** The closed set of API error codes (ADR 0002), each with its HTTP status and whether a retry can succeed. */
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

const errorCodes = Object.keys(ERROR_CODES) as [ErrorCode, ...ErrorCode[]];

/** `path` is the keys from the body down to the field; `code` is a rule id such as `password.missing_number`. */
const validationIssueSchema = z.strictObject({
  path: z.array(z.union([z.string(), z.int()])),
  code: z.string().describe("A rule id such as password.missing_number."),
});

export type ValidationIssue = z.infer<typeof validationIssueSchema>;

/** The body of every API error response; `message` is a developer hint, left out in production. */
export const errorEnvelopeSchema = z.strictObject({
  code: z.enum(errorCodes),
  status: z.int(),
  traceId: z.string().describe("The request id, also the X-Request-Id header."),
  retryable: z.boolean(),
  issues: z.array(validationIssueSchema).optional(),
  message: z.string().optional().describe("A developer hint, omitted in production."),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
