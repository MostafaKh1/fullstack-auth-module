import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export const REQUEST_ID_HEADER = "X-Request-Id";

// A caller-supplied id is reused only if it is short and plain, so it cannot forge or bloat log lines.
const ACCEPTABLE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function assignRequestId(req: IncomingMessage, res: ServerResponse): string {
  const supplied = req.headers["x-request-id"];
  const id = typeof supplied === "string" && ACCEPTABLE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}
