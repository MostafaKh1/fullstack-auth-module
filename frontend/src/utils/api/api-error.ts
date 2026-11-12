import type { ValidationIssue } from "@app/contract/common/error-envelope";
import { ORPCError } from "@orpc/client";
import { clientErrorCode } from "@/utils/error-copy";

// The API's codes read `area.reason` (ADR 0002), a code the front end may not know yet included; the ones oRPC raises
// itself, for a response that is no envelope (a proxy's page), are SCREAMING_CASE.
const isApiCode = (code: string) => /^[a-z]+\.[a-z_]+$/.test(code);

/** The code a failed request is shown by: the API's, or `unreachable` when no error of the API arrived. */
export function apiFailureCode(error: unknown): string {
  return error instanceof ORPCError && isApiCode(error.code) ? error.code : clientErrorCode.unreachable;
}

/** The typed error of a request the contract's schema refused; `defined` means oRPC checked its data against it. */
export function isValidationFailure(
  error: unknown,
): error is ORPCError<"request.validation_failed", { issues: ValidationIssue[] }> {
  return error instanceof ORPCError && error.defined && error.code === "request.validation_failed";
}
