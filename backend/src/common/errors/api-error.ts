import type { ErrorCode, ValidationIssue } from "@app/contract/error-envelope";

/** Branch on `code`, never on `message`. */
export class ApiError extends Error {
  readonly issues?: ValidationIssue[];

  constructor(
    readonly code: ErrorCode,
    options: { issues?: ValidationIssue[]; message?: string } = {},
  ) {
    super(options.message ?? code);
    this.name = "ApiError";
    this.issues = options.issues;
  }
}
