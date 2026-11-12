import { ORPCError } from "@orpc/client";
import { isAxiosError } from "axios";
import type { components } from "@/utils/api/api-types.generated";
import { clientErrorCode } from "@/utils/error-copy";

/** One field-level problem: `path` is the keys from the body down to the field, `code` is a rule id. */
export type ValidationIssue = NonNullable<components["schemas"]["ErrorEnvelope"]["issues"]>[number];

/** The body of every API error response (ADR 0002). `message` is a developer hint and is never shown. */
type ApiErrorEnvelope = components["schemas"]["ErrorEnvelope"];

/** What a caller reads from a failed request: its code and, for a validation failure, its issues. */
type ApiFailure = Pick<ApiErrorEnvelope, "code" | "issues">;

/**
 * The code and issues of the error envelope a failed request carries, from either client, or `null` when none
 * arrived: no response at all, or a response from something other than the API (a proxy's error page), which means
 * the API is unreachable.
 */
export function apiFailure(error: unknown): ApiFailure | null {
  // The oRPC client's decoder marks an error `defined` only when the body was an envelope.
  if (error instanceof ORPCError) {
    return error.defined
      ? {
          code: error.code as ApiErrorCode,
          issues: (error.data as { issues?: ValidationIssue[] } | undefined)?.issues,
        }
      : null;
  }
  if (!isAxiosError(error)) return null;
  const body: unknown = error.response?.data;
  if (typeof body !== "object" || body === null) return null;
  const { code } = body as { code?: unknown };
  return typeof code === "string" ? (body as ApiErrorEnvelope) : null;
}

/** The code a failed request is shown by: the envelope's, or `unreachable` when none arrived. */
export function apiFailureCode(error: unknown): string {
  return apiFailure(error)?.code ?? clientErrorCode.unreachable;
}

/** The closed set of error codes, from the contract. */
export type ApiErrorCode = ApiErrorEnvelope["code"];
