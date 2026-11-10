import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AppConfigService } from "../config/app-config.service";
import { ApiError } from "./errors/api-error";

/**
 * The `Origin` check of the cookie routes (refresh, Sign out), applied with `@UseGuards(OriginCsrfGuard)`.
 * The refresh cookie is `SameSite=Lax`, so this is what stops another site from using it (ADR 0001).
 * A request without `Origin` passes: browsers send one on every cross-site POST, so its absence means a
 * same-origin request or a non-browser client, which holds no victim's cookie.
 */
@Injectable()
export class OriginCsrfGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const origin = context.switchToHttp().getRequest<Request>().headers.origin;
    if (origin === undefined || this.config.get("corsOrigins").includes(origin)) return true;
    throw new ApiError("auth.origin_rejected", {
      message: "This route accepts only the front end's origin.",
    });
  }
}
