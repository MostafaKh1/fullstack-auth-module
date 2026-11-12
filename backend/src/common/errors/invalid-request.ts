import { ApiError } from "./api-error.js";

/** A Standard Schema issue, which both Zod and oRPC's input validation report. */
type SchemaIssue = {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
};

/** A refused body: `request.malformed` if not a JSON object, else one `{ path, code }` issue per failed rule id. */
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
