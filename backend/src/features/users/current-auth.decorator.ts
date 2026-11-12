import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { ApiError } from "@/common/errors/api-error";
import type { RequestWithAuthContext } from "@/common/guards/access-token.guard";
import type { AuthContext } from "@/common/services/access-token.service";

export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  const auth = context.switchToHttp().getRequest<RequestWithAuthContext>().authContext;
  if (!auth) throw new ApiError("auth.unauthenticated");
  return auth;
});
