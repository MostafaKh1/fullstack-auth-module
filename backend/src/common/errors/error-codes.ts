/** The closed set of API error codes (ADR 0002). */
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

/** `path` is the keys from the body down to the field; `code` is a rule id such as `password.missing_number`. */
export type ValidationIssue = { path: (string | number)[]; code: string };

type ErrorEnvelope = {
  code: ErrorCode;
  status: number;
  traceId: string;
  retryable: boolean;
  issues?: ValidationIssue[];
  message?: string;
};

/** The one place an envelope is built; `message` is a developer hint, left out in production (ADR 0002). */
export function errorEnvelope(
  code: ErrorCode,
  traceId: string,
  detail: { issues?: ValidationIssue[]; message: string; isProduction: boolean },
): ErrorEnvelope {
  const { status, retryable } = ERROR_CODES[code];
  const envelope: ErrorEnvelope = { code, status, traceId, retryable };
  if (detail.issues) envelope.issues = detail.issues;
  if (!detail.isProduction) envelope.message = detail.message;
  return envelope;
}

/** The envelope's schema in the API document, narrowed to the codes one response can carry. */
export function errorEnvelopeSchema(codes: string[]) {
  return {
    allOf: [
      { $ref: "#/components/schemas/ErrorEnvelope" },
      { type: "object", properties: { code: { type: "string", enum: codes } } },
    ],
  };
}
