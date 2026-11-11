import { ERROR_CODES, type ErrorCode, type ValidationIssue } from "./error-codes";

/** Branch on `code`, never on `message`. */
export class ApiError extends Error {
  readonly status: number;
  readonly issues?: ValidationIssue[];

  constructor(
    readonly code: ErrorCode,
    options: { issues?: ValidationIssue[]; message?: string; cause?: unknown } = {},
  ) {
    super(options.message ?? code, { cause: options.cause });
    this.name = "ApiError";
    this.status = ERROR_CODES[code].status;
    this.issues = options.issues;
  }
}
