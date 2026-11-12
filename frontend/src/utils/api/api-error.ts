import { isAxiosError } from "axios";
import type { components } from "@/utils/api/api-types.generated";
import { clientErrorCode } from "@/utils/error-copy";

/** One field-level problem: `path` is the keys from the body down to the field, `code` is a rule id. */
export type ValidationIssue = NonNullable<components["schemas"]["ErrorEnvelope"]["issues"]>[number];

/** The body of every API error response (ADR 0002). `message` is a developer hint and is never shown. */
type ApiErrorEnvelope = components["schemas"]["ErrorEnvelope"];

/**
 * The error envelope a failed request carries, or `null` when none arrived: no response at all, or a
 * response from something other than the API (a proxy's error page), which means the API is unreachable.
 */
export function apiErrorEnvelope(error: unknown): ApiErrorEnvelope | null {
  if (!isAxiosError(error)) return null;
  const body: unknown = error.response?.data;
  if (typeof body !== "object" || body === null) return null;
  const { code } = body as { code?: unknown };
  return typeof code === "string" ? (body as ApiErrorEnvelope) : null;
}

/** The code a failed request is shown by: the envelope's, or `unreachable` when none arrived. */
export function apiFailureCode(error: unknown): string {
  return apiErrorEnvelope(error)?.code ?? clientErrorCode.unreachable;
}

/** The closed set of error codes, from the contract. */
export type ApiErrorCode = ApiErrorEnvelope["code"];
