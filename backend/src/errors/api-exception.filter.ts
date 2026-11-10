import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";
import type { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";
import { AppConfigService } from "../config/app-config.service";
import { ApiError } from "./api-error";
import { ERROR_CODES, type ErrorCode, type ErrorEnvelope } from "./error-codes";

// What an HttpException raised by Nest or Express itself (not by our code) means in the closed set.
const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: "request.malformed",
  404: "route.not_found",
  413: "request.too_large",
  429: "request.rate_limited",
  503: "server.unavailable",
};

/** The one global exception filter: every error leaves the API as the envelope of ADR 0002. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PinoLogger,
    private readonly config: AppConfigService,
  ) {
    this.logger.setContext(ApiExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: unknown }>();
    const response = http.getResponse<Response>();

    const { code, issues, message } = this.classify(exception);
    const { status, retryable } = ERROR_CODES[code];

    if (status >= 500) {
      this.logger.error({ err: exception, code }, "request.failed");
    }

    const envelope: ErrorEnvelope = { code, status, traceId: String(request.id), retryable };
    if (issues) envelope.issues = issues;
    if (!this.config.isProduction) envelope.message = message;

    response.status(status).json(envelope);
  }

  private classify(exception: unknown): { code: ErrorCode; issues?: ApiError["issues"]; message: string } {
    if (exception instanceof ApiError) {
      return { code: exception.code, issues: exception.issues, message: exception.message };
    }
    if (exception instanceof HttpException) {
      const code = CODE_BY_STATUS[exception.getStatus()] ?? "server.internal";
      return { code, message: exception.message };
    }
    // Anything else is a bug or an infrastructure failure: nothing about it reaches the caller.
    return { code: "server.internal", message: "Unexpected error; see the server log for this traceId." };
  }
}
