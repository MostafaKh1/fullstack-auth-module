import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { ERROR_CODES, type ErrorCode } from "@/common/errors/error-codes.js";

/** The envelope of ADR 0002 narrowed to the codes one response can carry. */
export function errorEnvelopeSchema(codes: string[]) {
  return {
    allOf: [
      { $ref: "#/components/schemas/ErrorEnvelope" },
      { type: "object", properties: { code: { type: "string", enum: codes } } },
    ],
  };
}

export function ApiErrors(...codes: ErrorCode[]): MethodDecorator & ClassDecorator {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of codes) {
    const { status } = ERROR_CODES[code];
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  return applyDecorators(
    ...[...byStatus].map(([status, group]) =>
      ApiResponse({
        status,
        description: `Error codes: ${group.join(", ")}`,
        schema: errorEnvelopeSchema(group),
      }),
    ),
  );
}
