import {
  ERROR_CODES,
  type ErrorCode,
  type ErrorEnvelope,
  type ValidationIssue,
} from "@app/contract/error-envelope";

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
