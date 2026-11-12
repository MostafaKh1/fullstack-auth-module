import { ApiError } from "./api-error.js";

/** A Standard Schema issue, which both Zod and oRPC's input validation report. */
type SchemaIssue = {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
};

/**
 * The answer to a body the request schema refused: `request.malformed` when it is not a JSON object, otherwise
 * `request.validation_failed` with one `{ path, code }` issue per check, the check's error being its rule id (ADR 0002).
 */
export function invalidRequest(body: unknown, issues: readonly SchemaIssue[]): ApiError {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return new ApiError("request.malformed", { message: "The body must be a JSON object." });
  }
  return new ApiError("request.validation_failed", {
    issues: issues.map((issue) => ({
      path: (issue.path ?? []).map((segment) => {
        const key = typeof segment === "object" ? segment.key : segment;
        return typeof key === "number" ? key : String(key);
      }),
      code: issue.message,
    })),
  });
}
