import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/access-token.guard";
import type { AccessClaims } from "../auth/auth.types";
import { ApiError } from "./errors/api-error";

/** The signed-in User and Session of a protected route (`{ userId, sessionId }`), as the global guard established them. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AccessClaims => {
  const claims = context.switchToHttp().getRequest<AuthenticatedRequest>().authSession;
  if (!claims) throw new ApiError("auth.unauthenticated");
  return claims;
});
