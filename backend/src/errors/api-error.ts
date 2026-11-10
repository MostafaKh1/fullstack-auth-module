import { ERROR_CODES, type ErrorCode, type ValidationIssue } from "./error-codes";

/** The one error application code throws; the global filter turns it into the envelope. Branch on `code`, never on `message`. */
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
