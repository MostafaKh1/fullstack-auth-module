import { type ErrorRequestHandler, json, type RequestHandler } from "express";
import { assignRequestId } from "../../logging/request-id";
import { ERROR_CODES, type ErrorCode, type ErrorEnvelope } from "../errors/error-codes";

const BODY_PARSER_ERRORS: Record<string, ErrorCode> = {
  "entity.too.large": "request.too_large",
  "entity.parse.failed": "request.malformed",
};

/**
 * Parses JSON bodies up to `limit` and answers the two failures of the parser itself in the error envelope. The
 * parser runs before Nest's routing, so its errors never reach the global filter and are rendered here instead.
 */
export function jsonBody(limit: string, isProduction: boolean): (RequestHandler | ErrorRequestHandler)[] {
  const parse = json({ limit });
  const render: ErrorRequestHandler = (error, req, res, next) => {
    const code = BODY_PARSER_ERRORS[(error as { type?: string }).type ?? ""];
    if (!code) {
      next(error);
      return;
    }
    const { status, retryable } = ERROR_CODES[code];
    const envelope: ErrorEnvelope = { code, status, traceId: assignRequestId(req, res), retryable };
    if (!isProduction) envelope.message = (error as Error).message;
    res.status(status).json(envelope);
  };
  return [parse, render];
}
