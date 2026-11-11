import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { ERROR_CODES, type ErrorCode } from "../errors/error-codes";

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
        schema: {
          allOf: [{ $ref: "#/components/schemas/ErrorEnvelope" }, { properties: { code: { enum: group } } }],
        },
      }),
    ),
  );
}
