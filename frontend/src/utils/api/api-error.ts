import type { ErrorCode, ErrorEnvelope, ValidationIssue } from "@app/contract/error-envelope";
import { ORPCError } from "@orpc/client";
import { clientErrorCode } from "@/utils/error-copy";

export type { ValidationIssue };

/** The body of every API error response (ADR 0002). `message` is a developer hint and is never shown. */
type ApiErrorEnvelope = ErrorEnvelope;

/** Whether a response body is the API's error envelope rather than, say, a proxy's error page. */
export function isErrorEnvelope(body: unknown): body is ApiErrorEnvelope {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { code?: unknown }).code === "string" &&
    typeof (body as { status?: unknown }).status === "number"
  );
}

/** The error envelope a failed request carries, or `null` when none arrived. */
export function apiErrorEnvelope(error: unknown): ApiErrorEnvelope | null {
  // No envelope means no response at all, or a response from something other than the API, so it is unreachable.
  // The oRPC client keeps the envelope it decoded an error from as that error's cause.
  const body: unknown = error instanceof ORPCError ? error.cause : undefined;
  return isErrorEnvelope(body) ? body : null;
}

/** The code a failed request is shown by: the envelope's, or `unreachable` when none arrived. */
export function apiFailureCode(error: unknown): string {
  return apiErrorEnvelope(error)?.code ?? clientErrorCode.unreachable;
}

/** The closed set of error codes, from the contract. */
export type ApiErrorCode = ErrorCode;
