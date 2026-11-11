import { type ErrorRequestHandler, json, type RequestHandler } from "express";
import { assignRequestId } from "../../logging/request-id";
import { type ErrorCode, errorEnvelope } from "../errors/error-codes";

const BODY_PARSER_ERRORS: Record<string, ErrorCode> = {
  "entity.too.large": "request.too_large",
  "entity.parse.failed": "request.malformed",
};

/** Runs before Nest's routing, so the parser's own errors never reach the global filter and are rendered here. */
export function jsonBody(limit: string, isProduction: boolean): (RequestHandler | ErrorRequestHandler)[] {
  const parse = json({ limit });
  const render: ErrorRequestHandler = (error, req, res, next) => {
    const code = BODY_PARSER_ERRORS[(error as { type?: string }).type ?? ""];
    if (!code) {
      next(error);
      return;
    }
    const envelope = errorEnvelope(code, assignRequestId(req, res), {
      message: (error as Error).message,
      isProduction,
    });
    res.status(envelope.status).json(envelope);
  };
  return [parse, render];
}
