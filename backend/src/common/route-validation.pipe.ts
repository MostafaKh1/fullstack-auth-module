import type { PipeTransform } from "@nestjs/common";
import type { z } from "zod";
import { ApiError } from "./errors/api-error";

/**
 * Parses a request body with a Zod schema whose every check carries a rule id as its error (ADR 0002),
 * answering `400 request.validation_failed` with one `{ path, code }` issue per broken rule.
 */
export class RouteValidationPipe<Schema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<Schema>
> {
  constructor(private readonly schema: Schema) {}

  transform(body: unknown): z.output<Schema> {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new ApiError("request.malformed", { message: "The body must be a JSON object." });
    }
    const result = this.schema.safeParse(body);
    if (!result.success) {
      throw new ApiError("request.validation_failed", {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.map((key) => (typeof key === "number" ? key : String(key))),
          code: issue.message,
        })),
      });
    }
    return result.data;
  }
}
