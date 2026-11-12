import { ERROR_CODES, type ErrorCode, type ValidationIssue } from "@app/contract/common/error-envelope";
import { ORPCError, type ORPCModuleConfig } from "@orpc/nest";
import { ValidationError } from "@orpc/server";
import {
  ResponseHeadersPlugin,
  experimental_RethrowHandlerPlugin as RethrowHandlerPlugin,
} from "@orpc/server/plugins";
import type { Request } from "express";
import { ApiError } from "@/common/errors/api-error.js";
import { errorEnvelope } from "@/common/errors/error-envelope.js";
import { invalidRequest } from "@/common/errors/invalid-request.js";

declare module "@orpc/nest" {
  /** What every procedure's handler reads: the request, and the headers its response will carry. */
  interface ORPCGlobalContext {
    request: Request;
    resHeaders: Headers;
  }
}

const isErrorCode = (code: string): code is ErrorCode => Object.hasOwn(ERROR_CODES, code);

/** A caller's mistake as the typed error the contract declares; anything else is left as it was thrown. */
function asCallerError(error: unknown): unknown {
  const refused =
    error instanceof ORPCError && error.code === "BAD_REQUEST" && error.cause instanceof ValidationError
      ? invalidRequest(error.cause.data, error.cause.issues)
      : error;
  if (!(refused instanceof ApiError) || ERROR_CODES[refused.code].status >= 500) return refused;
  return new ORPCError(refused.code, {
    status: ERROR_CODES[refused.code].status,
    message: refused.message,
    data: refused.issues ? { issues: refused.issues } : undefined,
    cause: refused,
  });
}

/** oRPC's options for one request: its context, its error encoder writing the envelope of ADR 0002, its plugins. */
export function orpcOptions(request: Request & { id?: unknown }, isProduction: boolean): ORPCModuleConfig {
  return {
    // ResponseHeadersPlugin merges these headers into the response, the refresh cookie among them.
    context: { request, resHeaders: new Headers() },
    interceptors: [
      async ({ next }) => {
        try {
          return await next();
        } catch (error) {
          throw asCallerError(error);
        }
      },
    ],
    plugins: [
      new ResponseHeadersPlugin(),
      // Only a caller's mistake (a 4xx code) is left to the encoder. Every other error goes back to Nest, so the global
      // filter logs a failure on our side with its stack, which the encoder would answer silently.
      new RethrowHandlerPlugin({
        filter: (error) => !(error instanceof ORPCError && isErrorCode(error.code)),
      }),
    ],
    customErrorResponseBodyEncoder: (error) =>
      errorEnvelope(error.code as ErrorCode, String(request.id), {
        issues: (error.data as { issues?: ValidationIssue[] } | undefined)?.issues,
        message: error.message,
        isProduction,
      }),
  };
}
