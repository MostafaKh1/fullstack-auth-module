import { isAxiosError } from "axios";

/**
 * One field-level problem: `path` is the keys from the body down to the field (`["password"]`), `code` is a rule id
 * such as `password.missing_number`.
 */
export type ValidationIssue = { path: (string | number)[]; code: string };

/** The body of every API error response (ADR 0002). `message` is a developer hint and is never shown. */
export type ApiErrorEnvelope = {
  code: string;
  status: number;
  traceId: string;
  retryable: boolean;
  issues?: ValidationIssue[];
  message?: string;
};

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
