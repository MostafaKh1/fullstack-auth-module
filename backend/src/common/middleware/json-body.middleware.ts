import type { ErrorCode } from "@app/contract/error-envelope";
import { type ErrorRequestHandler, json, type RequestHandler } from "express";
import { errorEnvelope } from "@/common/errors/error-envelope.js";
import { assignRequestId } from "@/logging/request-id.js";

/** The API's only body parser; it answers its client errors itself, so none is logged as a server failure. */
export function jsonBody(limit: string, isProduction: boolean): (RequestHandler | ErrorRequestHandler)[] {
  const parse = json({ limit });
  // oRPC reads the stream itself, with no size cap, when it finds no body: a body this parser skipped (a form,
  // multipart, text) must reach a procedure as no body at all, which its input schema refuses as `request.malformed`.
  const settle: RequestHandler = (req, _res, next) => {
    req.body ??= null;
    next();
  };
  const render: ErrorRequestHandler = (error, req, res, next) => {
    const code = clientErrorCode(error);
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

// The parser raises every error with a `type` and an HTTP status: a 4xx is the caller's (broken JSON, an unsupported
// charset or content encoding, an aborted upload), a 5xx its own.
function clientErrorCode(error: unknown): ErrorCode | undefined {
  const { type, status } = error as { type?: unknown; status?: unknown };
  const isClientError =
    typeof type === "string" && typeof status === "number" && status >= 400 && status < 500;
  if (!isClientError) return undefined;
  return status === 413 ? "request.too_large" : "request.malformed";
}
