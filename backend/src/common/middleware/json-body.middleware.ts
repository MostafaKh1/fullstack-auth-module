import type { ErrorCode } from "@app/contract/error-envelope";
import { type ErrorRequestHandler, json, type RequestHandler } from "express";
import { errorEnvelope } from "@/common/errors/error-envelope.js";
import { assignRequestId } from "@/logging/request-id.js";

const BODY_PARSER_ERRORS: Record<string, ErrorCode> = {
  "entity.too.large": "request.too_large",
  "entity.parse.failed": "request.malformed",
};

/** Runs before Nest's routing, so the parser's own errors never reach the global filter and are rendered here. */
export function jsonBody(limit: string, isProduction: boolean): (RequestHandler | ErrorRequestHandler)[] {
  const parse = json({ limit });
  // oRPC reads the stream itself, with no size cap, when it finds no body: a body this parser skipped (multipart, text)
  // must reach a procedure as no body at all, which its input schema refuses as `request.malformed`.
  const settle: RequestHandler = (req, _res, next) => {
    req.body ??= null;
    next();
  };
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
  return [parse, settle, render];
}
