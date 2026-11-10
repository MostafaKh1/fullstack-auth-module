import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/access-token.guard";
import type { AccessClaims } from "../auth/access-token.service";
import { ApiError } from "./errors/api-error";

/** The signed-in User and Session of a protected route, as the global guard established them. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AccessClaims => {
  const session = context.switchToHttp().getRequest<AuthenticatedRequest>().authSession;
  if (!session) throw new ApiError("auth.unauthenticated");
  return session;
});
