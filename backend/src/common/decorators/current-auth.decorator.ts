import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { ApiError } from "../errors/api-error";
import type { AuthenticatedRequest } from "../guards/access-token.guard";
import type { AuthContext } from "../services/access-token.service";

/** Who a protected route's request is from (`{ userId, sessionId }`), as the global guard decoded it from the access token. */
export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().authContext;
  if (!auth) throw new ApiError("auth.unauthenticated");
  return auth;
});
