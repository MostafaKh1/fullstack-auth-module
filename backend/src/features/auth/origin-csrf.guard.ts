import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { ApiError } from "@/common/errors/api-error.js";
import { AppConfigService } from "@/config/app-config.service.js";

/** Stops other sites using the `SameSite=Lax` refresh cookie, or planting one by Sign up or Sign in (ADR 0001). */
@Injectable()
export class OriginCsrfGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const origin = context.switchToHttp().getRequest<Request>().headers.origin;
    // Browsers send `Origin` on every cross-site POST, so its absence means a same-origin request or a non-browser
    // client, which holds no victim's cookie.
    if (origin === undefined || this.config.get("corsOrigins").includes(origin)) return true;
    throw new ApiError("auth.origin_rejected", {
      message: "This route accepts only the front end's origin.",
    });
  }
}
