import type { PipeTransform } from "@nestjs/common";
import type { z } from "zod";
import { invalidRequest } from "@/common/errors/invalid-request.js";

/** Every check of the schema carries a rule id as its error (ADR 0002), reported as one `{ path, code }` issue. */
export class RouteValidationPipe<Schema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<Schema>
> {
  constructor(private readonly schema: Schema) {}

  transform(body: unknown): z.output<Schema> {
    const result = this.schema.safeParse(body);
    if (!result.success) throw invalidRequest(body, result.error.issues);
    return result.data;
  }
}
