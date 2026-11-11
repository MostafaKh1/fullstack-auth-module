import { isAxiosError } from "axios";
import type { components } from "./api-types.generated";

/** One field-level problem: `path` is the keys from the body down to the field, `code` is a rule id. */
export type ValidationIssue = components["schemas"]["ErrorEnvelope"]["issues"] extends
  (infer Issue)[] | undefined
  ? Issue
  : never;

/** The body of every API error response (ADR 0002). `message` is a developer hint and is never shown. */
export type ApiErrorEnvelope = components["schemas"]["ErrorEnvelope"];

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
