import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { ApiError } from "../errors/api-error";
import type { RequestWithAuthContext } from "../guards/access-token.guard";
import type { AuthContext } from "../services/access-token.service";

export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  const auth = context.switchToHttp().getRequest<RequestWithAuthContext>().authContext;
  if (!auth) throw new ApiError("auth.unauthenticated");
  return auth;
});
