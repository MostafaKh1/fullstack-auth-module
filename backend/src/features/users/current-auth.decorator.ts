import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { ApiError } from "@/common/errors/api-error.js";
import type { RequestWithAuthContext } from "@/common/guards/access-token.guard.js";
import type { AuthContext } from "@/common/services/access-token.service.js";

export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  const auth = context.switchToHttp().getRequest<RequestWithAuthContext>().authContext;
  if (!auth) throw new ApiError("auth.unauthenticated");
  return auth;
});
